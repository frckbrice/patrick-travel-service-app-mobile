# Chat Cache Service - Audit & Architecture

## Overview
The `ChatCacheService` implements a **two-tier caching system** (memory + persistent storage) for chat messages and conversations to improve performance and offline capability.

---

## Architecture

### Two-Tier Cache System

```
┌─────────────────────────────────────────┐
│        Memory Cache (Fast)              │
│  - Instant access                        │
│  - Lost on app restart                    │
│  - Auto-synced with persistent storage   │
└─────────────────────────────────────────┘
           ↕ (syncs both ways)
┌─────────────────────────────────────────┐
│    Persistent Storage (AsyncStorage)     │
│  - Survives app restart                   │
│  - Slower than memory                    │
│  - Permanent until expiration            │
└─────────────────────────────────────────┘
```

### Cache Types

1. **Message Cache** (`messageCache: MessageCache`)
   - Key: `caseId` (string)
   - Value: `CacheEntry<PaginatedMessageCache>`
   - Stores: Messages for a specific chat conversation

2. **Conversation Cache** (`conversationCache: ConversationCache`)
   - Key: `userId` (string)
   - Value: `CacheEntry<Conversation[]>`
   - Stores: List of conversations for a user

---

## Cache Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| `MESSAGE_CACHE_TTL` | 5 minutes | Messages expire after 5 min |
| `CONVERSATION_CACHE_TTL` | 2 minutes | Conversations expire after 2 min |
| `MAX_MESSAGES_IN_CACHE` | 50 messages | FIFO limit per chat |
| `MAX_CACHE_SIZE` | 50 conversations | Max cached conversations (not enforced) |

---

## How It Works

### 1. **Reading from Cache** (`getCachedMessages` / `getCachedConversations`)

**Flow:**
```
1. Check memory cache first (fast path)
   ├─ If found AND not expired → return immediately
   └─ If expired → delete from memory
   
2. Check persistent storage (AsyncStorage)
   ├─ If found AND not expired → load into memory, then return
   └─ If expired → delete from storage
   
3. Return null (cache miss)
```

**Example:**
- Memory hit: ~0ms access
- Persistent hit: ~10-50ms (AsyncStorage read + JSON parse)
- Cache miss: Falls back to Firebase

### 2. **Writing to Cache** (`setCachedMessages` / `setCachedConversations`)

**Flow:**
```
1. Create CacheEntry with:
   - data: The actual messages/conversations
   - timestamp: Current time
   - expiresAt: timestamp + TTL

2. Update memory cache (instant)

3. Persist to AsyncStorage (async, non-blocking)
   - Key format: `chat_messages_{caseId}` or `chat_conversations_{userId}`
   - Value: JSON stringified CacheEntry
```

**Features:**
- ✅ Dual-write (memory + persistent)
- ✅ Automatic expiration tracking
- ✅ Last timestamp calculation for pagination

### 3. **Adding Single Message** (`addMessageToCache`)

**Flow:**
```
1. Get existing cache for caseId
2. Check for duplicates (by id, tempId, or timestamp+senderId)
3. If duplicate → skip
4. If new → append to existing messages
5. Enforce FIFO limit: Keep only last 50 messages
6. Update cache
```

**FIFO Enforcement:**
```javascript
const updatedMessages = [...cachedData.messages, message];
const fifoMessages = updatedMessages.slice(-MAX_MESSAGES_IN_CACHE); // Keep last 50
```

### 4. **Prepending Older Messages** (`prependMessagesToCache`)

**Flow:**
```
1. Get existing cache
2. Filter duplicates (by id or tempId)
3. Prepend unique older messages: [...olderMessages, ...existingMessages]
4. Update cache (keeps hasMore and totalCount)
```

**Use Case:** Loading older messages via pagination

### 5. **Updating Message** (`updateMessageInCache`)

**Flow:**
```
1. Get existing cache
2. Find message by messageId
3. Merge updates: { ...existingMessage, ...updates }
4. Save back to cache
```

**Use Case:** Updating message status (pending → sent → failed)

### 6. **Cleanup Operations**

**A. On Chat Close** (`cleanupCacheOnChatClose`)
- Keeps only last 20 messages (FIFO)
- Reduces memory usage
- Preserves `hasMore` and `totalCount`

**B. Expired Cache** (`clearExpiredCache`)
- Scans memory cache → deletes expired entries
- Scans AsyncStorage → removes expired keys
- Runs automatically (should be called periodically)

**C. Corrupted Cache** (`clearCorruptedCache`)
- Validates structure: `data.messages` must be array
- Removes invalid entries
- Prevents crashes from malformed data

---

## Cache Data Structure

### CacheEntry<T>
```typescript
{
  data: T,                    // The actual data
  timestamp: number,          // When cached
  expiresAt: number          // When it expires
}
```

### PaginatedMessageCache
```typescript
{
  messages: ChatMessage[],     // Array of messages
  hasMore: boolean,            // Are there more messages?
  lastTimestamp: number,       // Oldest message timestamp
  totalCount: number          // Total messages in conversation
}
```

### Storage Keys
- Messages: `chat_messages_{caseId}`
- Conversations: `chat_conversations_{userId}`

---

## Critical Issues Found

### ⚠️ Issue 1: Performance - Stats Called Too Frequently
**Location:** Lines 51, 113
```typescript
const stats = await this.getDetailedCacheStats(); // Called on EVERY cache read/write
```

**Problem:**
- `getDetailedCacheStats()` scans ALL AsyncStorage keys on every cache operation
- This is very expensive (async I/O + JSON parsing)
- Called on every `getCachedMessages` and `setCachedMessages`

**Impact:**
- Slows down cache operations significantly
- Can cause UI jank during chat scrolling
- Unnecessary I/O operations

**Recommendation:**
- Remove stats logging from hot paths
- Only call stats on demand (debug mode)
- Cache stats result for short duration

### ⚠️ Issue 2: Race Condition in prependMessagesToCache
**Location:** Lines 150-172

**Problem:**
- `getCachedMessages()` is async and can return stale data
- If two prepends happen simultaneously, one may overwrite the other
- No locking mechanism

**Scenario:**
```
Thread 1: getCachedMessages() → returns 10 messages
Thread 2: getCachedMessages() → returns 10 messages
Thread 1: prepend 5 older → saves 15 messages
Thread 2: prepend 5 older → saves 15 messages (lost Thread 1's work)
```

**Recommendation:**
- Add mutex/lock per caseId
- Or use optimistic locking with version numbers

### ⚠️ Issue 3: Memory Leak Potential
**Location:** Lines 28-29

**Problem:**
- `messageCache` and `conversationCache` grow indefinitely
- Only expired entries are removed
- `MAX_CACHE_SIZE` constant exists but isn't enforced

**Recommendation:**
- Enforce `MAX_CACHE_SIZE` (50 conversations)
- Implement LRU eviction
- Periodic cleanup job

### ⚠️ Issue 4: Inefficient FIFO Limit in addMessageToCache
**Location:** Line 138

**Problem:**
- Uses `slice(-50)` which keeps last 50, but this is backwards for FIFO
- Newest messages are appended, so keeping last 50 keeps newest (correct)
- But name suggests "oldest first" (FIFO), which is confusing

**Clarification:**
- Actually works correctly (keeps newest 50)
- But naming/misunderstanding could lead to bugs

### ⚠️ Issue 5: Duplicate Check Logic Inconsistency
**Location:** Lines 130-133 vs 155-158

**Problem:**
- `addMessageToCache`: Checks `id || tempId || (timestamp + senderId)`
- `prependMessagesToCache`: Only checks `id || tempId`
- Inconsistent deduplication logic

**Recommendation:**
- Standardize duplicate detection
- Extract to helper function

### ⚠️ Issue 6: lastTimestamp Calculation Error
**Location:** Line 93

**Problem:**
```typescript
const lastTimestamp = messages.length > 0 ? Math.min(...messages.map(m => m.timestamp)) : 0;
```

**Analysis:**
- This gets the **oldest** timestamp (minimum)
- But `lastTimestamp` typically means "most recent" or "last seen"
- For pagination, you need the **oldest** timestamp to load older messages
- So it's correct for pagination, but naming is confusing

**Clarification:**
- This is actually correct for pagination (need oldest to load older)
- Rename to `oldestTimestamp` for clarity

### ⚠️ Issue 7: No Cache Warming Strategy
**Problem:**
- Cache is populated only when explicitly accessed
- No pre-loading of likely-needed data
- User waits for cache miss → Firebase → render

**Recommendation:**
- Preload conversations on app start
- Preload last 20 messages for active chats

### ⚠️ Issue 8: AsyncStorage Error Handling
**Location:** Multiple places

**Problem:**
- Errors are logged but operations continue
- Partial failures (memory updated but storage failed) leave inconsistent state
- No retry mechanism

**Recommendation:**
- Add retry logic for AsyncStorage failures
- Track sync state (memory vs persistent)
- Background sync job

---

## Cache Flow Diagram

### Reading Messages
```
User opens chat
    ↓
loadInitialMessages() called
    ↓
getCachedMessages(caseId)
    ├─ Memory cache hit? → Return (0ms)
    ├─ Persistent hit? → Load to memory → Return (~50ms)
    └─ Cache miss? → Query Firebase → Cache result → Return (~200-500ms)
```

### Writing Messages
```
New message arrives
    ↓
addMessageToCache(caseId, message)
    ├─ Get existing cache
    ├─ Check duplicates
    ├─ Append message
    ├─ Enforce FIFO (keep last 50)
    ├─ Update memory cache
    └─ Persist to AsyncStorage (async)
```

---

## Performance Characteristics

| Operation | Memory Cache | Persistent Cache | Firebase |
|-----------|--------------|------------------|----------|
| Read | ~0ms | ~10-50ms | ~200-500ms |
| Write | ~0ms | ~20-100ms | ~100-300ms |
| Capacity | Limited by RAM | ~6MB (AsyncStorage limit) | Unlimited |
| Persistence | Lost on restart | Survives restart | Permanent |

---

## Recommendations

### Immediate Fixes
1. **Remove stats logging from hot paths** (Lines 51, 113)
2. **Add per-caseId locking** for concurrent prepend operations
3. **Enforce MAX_CACHE_SIZE** with LRU eviction

### Performance Improvements
1. **Batch AsyncStorage operations** (use `multiSet`/`multiGet`)
2. **Debounce cache writes** during rapid message updates
3. **Use background sync** for persistent storage updates

### Reliability Improvements
1. **Add cache versioning** to handle schema changes
2. **Implement cache invalidation** strategies
3. **Add cache health monitoring** and auto-repair

---

## Summary

The cache system provides good offline capability but has performance and consistency issues:
- ✅ Two-tier caching (fast memory + persistent)
- ✅ Automatic expiration
- ✅ Duplicate prevention
- ⚠️ Expensive stats logging on every operation
- ⚠️ Race conditions in concurrent updates
- ⚠️ No size limits enforced
- ⚠️ Potential memory leaks

**Overall Assessment:** Functional but needs optimization for production use.


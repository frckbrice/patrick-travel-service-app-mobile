# Mobile App Email Reply Integration Guide

## Overview

This guide explains how to integrate email reply functionality in the mobile app using the `/api/emails/incoming` endpoint. When a client receives an email from an agent/admin and wants to reply, the mobile app can send the reply to this endpoint, which will process it and notify the original sender.

## Table of Contents

1. [Understanding the Email Thread System](#understanding-the-email-thread-system)
2. [Endpoint Details](#endpoint-details)
3. [Extracting Thread ID from Emails](#extracting-thread-id-from-emails)
4. [Integration Steps](#integration-steps)
5. [Code Examples](#code-examples)
6. [Error Handling](#error-handling)
7. [Testing](#testing)

---

## Understanding the Email Thread System

### What is a Thread ID?

When an agent/admin sends an email to a client, the system generates a unique **thread ID** to track the conversation. This thread ID is:

- **Format**: `{timestamp}-{userId}-{randomString}`
  - Example: `1704067200000-abc123-def456`
- **Purpose**: Links all emails in a conversation thread
- **Storage**: Stored in the `emailThreadId` field of the Message model

### Where is Thread ID Stored?

The thread ID is embedded in the email in **two places**:

1. **Email Subject Line**: `[THREAD:threadId] Original Subject`
   - Example: `[THREAD:1704067200000-abc123-def456] Case Status Update`

2. **Email Headers** (for advanced parsing):
   - `X-Thread-ID`: Direct thread ID
   - `In-Reply-To`: `<threadId@patricktravel.com>`
   - `References`: `<threadId@patricktravel.com>`

### Email Structure

When a client receives an email, it looks like this:

```
Subject: [THREAD:1704067200000-abc123-def456] Your Case Status Update
From: agent@patricktravel.com
To: client@example.com

[Email content here]
```

---

## Endpoint Details

### Base URL
```
POST {BASE_URL}/api/emails/incoming
```

### Authentication
Include JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Request Format

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "threadId": "string",      // Required: Email thread ID from original email
  "senderId": "string",     // Required: Client user ID (UUID)
  "content": "string",       // Required: Reply message text
  "subject": "string"        // Optional: Reply subject (defaults to "Re: Original Subject")
}
```

### Response Format

**Success Response** (200 OK):
```json
{
  "success": true,
  "processed": true,
  "messageId": "uuid-of-created-message",
  "threadId": "original-thread-id"
}
```

**Error Response** (400/401/403/404/500):
```json
{
  "error": "Error message description",
  "processed": false
}
```

---

## Extracting Thread ID from Emails

### Method 1: Extract from Subject Line (Recommended)

The thread ID is embedded in the subject line in the format: `[THREAD:threadId]`

**Implementation Pattern**:
```regex
\[THREAD:([^\]]+)\]
```

**Code Examples**:

#### React Native / JavaScript
```javascript
function extractThreadIdFromSubject(subject) {
  const match = subject.match(/\[THREAD:([^\]]+)\]/);
  return match ? match[1] : null;
}

// Usage
const emailSubject = "[THREAD:1704067200000-abc123-def456] Case Status Update";
const threadId = extractThreadIdFromSubject(emailSubject);
// Returns: "1704067200000-abc123-def456"
```

#### Swift (iOS)
```swift
func extractThreadId(from subject: String) -> String? {
    let pattern = #"\[THREAD:([^\]]+)\]"#
    let regex = try? NSRegularExpression(pattern: pattern, options: [])
    let range = NSRange(subject.startIndex..., in: subject)
    
    if let match = regex?.firstMatch(in: subject, options: [], range: range) {
        if let threadIdRange = Range(match.range(at: 1), in: subject) {
            return String(subject[threadIdRange])
        }
    }
    return nil
}

// Usage
let emailSubject = "[THREAD:1704067200000-abc123-def456] Case Status Update"
let threadId = extractThreadId(from: emailSubject)
// Returns: Optional("1704067200000-abc123-def456")
```

#### Kotlin (Android)
```kotlin
fun extractThreadIdFromSubject(subject: String): String? {
    val pattern = Regex("""\[THREAD:([^\]]+)\]""")
    val match = pattern.find(subject)
    return match?.groupValues?.get(1)
}

// Usage
val emailSubject = "[THREAD:1704067200000-abc123-def456] Case Status Update"
val threadId = extractThreadIdFromSubject(emailSubject)
// Returns: "1704067200000-abc123-def456"
```

### Method 2: Extract from Email Headers

If your email library provides access to headers:

```javascript
// JavaScript example
function extractThreadIdFromHeaders(email) {
  // Priority 1: X-Thread-ID header
  if (email.headers['X-Thread-ID']) {
    return email.headers['X-Thread-ID'];
  }
  
  // Priority 2: In-Reply-To header
  if (email.headers['In-Reply-To']) {
    const inReplyTo = email.headers['In-Reply-To'];
    const match = inReplyTo.match(/<([^@]+)@/);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // Priority 3: Extract from subject (fallback)
  return extractThreadIdFromSubject(email.subject);
}
```

---

## Integration Steps

### Step 1: Display Email in Mobile App

When showing an email to the user:
1. **Extract and store the thread ID** when the email is first loaded
2. **Store it with the email record** for later use
3. **Display the email** with a "Reply" button

### Step 2: Capture User Reply

When user taps "Reply":
1. Show a reply compose screen
2. Pre-fill subject with "Re: " prefix (optional, will be auto-generated if omitted)
3. Allow user to type reply message

### Step 3: Send Reply to Backend

When user submits reply:
1. **Get required data**:
   - Thread ID (from original email)
   - Current user ID (from authentication)
   - Reply content (from user input)
   - Reply subject (optional)

2. **Call the endpoint** with this data

3. **Handle response**:
   - Show success message
   - Update UI to show reply was sent
   - Handle errors appropriately

### Step 4: Update Local State

After successful reply:
- Mark original email as "replied"
- Optionally refresh email list
- Show confirmation to user

---

## Code Examples

### React Native (TypeScript)

```typescript
interface EmailReplyRequest {
  threadId: string;
  senderId: string;
  content: string;
  subject?: string;
}

interface EmailReplyResponse {
  success: boolean;
  processed: boolean;
  messageId: string;
  threadId: string;
}

class EmailService {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  /**
   * Extract thread ID from email subject
   */
  extractThreadId(subject: string): string | null {
    const match = subject.match(/\[THREAD:([^\]]+)\]/);
    return match ? match[1] : null;
  }

  /**
   * Send email reply to backend
   */
  async sendEmailReply(
    threadId: string,
    senderId: string,
    content: string,
    subject?: string
  ): Promise<EmailReplyResponse> {
    const requestBody: EmailReplyRequest = {
      threadId,
      senderId,
      content: content.trim(),
      ...(subject && { subject }),
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/emails/incoming`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.authToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email reply');
      }

      const data: EmailReplyResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Email reply error:', error);
      throw error;
    }
  }
}

// Usage Example
const emailService = new EmailService(
  'https://api.patricktravel.com',
  userAuthToken
);

// When user receives an email
const originalEmail = {
  subject: '[THREAD:1704067200000-abc123-def456] Case Status Update',
  // ... other email fields
};

const threadId = emailService.extractThreadId(originalEmail.subject);
if (!threadId) {
  console.error('Could not extract thread ID from email');
  return;
}

// When user submits reply
const handleReply = async () => {
  try {
    const result = await emailService.sendEmailReply(
      threadId,
      currentUserId,
      replyContent,
      'Re: Case Status Update' // Optional
    );

    console.log('Reply sent successfully:', result.messageId);
    Alert.alert('Success', 'Your reply has been sent!');
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};
```

### Swift (iOS)

```swift
import Foundation

struct EmailReplyRequest: Codable {
    let threadId: String
    let senderId: String
    let content: String
    let subject: String?
}

struct EmailReplyResponse: Codable {
    let success: Bool
    let processed: Bool
    let messageId: String
    let threadId: String
}

class EmailService {
    private let baseURL: String
    private let authToken: String
    
    init(baseURL: String, authToken: String) {
        self.baseURL = baseURL
        self.authToken = authToken
    }
    
    /// Extract thread ID from email subject
    func extractThreadId(from subject: String) -> String? {
        let pattern = #"\[THREAD:([^\]]+)\]"#
        let regex = try? NSRegularExpression(pattern: pattern, options: [])
        let range = NSRange(subject.startIndex..., in: subject)
        
        if let match = regex?.firstMatch(in: subject, options: [], range: range) {
            if let threadIdRange = Range(match.range(at: 1), in: subject) {
                return String(subject[threadIdRange])
            }
        }
        return nil
    }
    
    /// Send email reply to backend
    func sendEmailReply(
        threadId: String,
        senderId: String,
        content: String,
        subject: String? = nil,
        completion: @escaping (Result<EmailReplyResponse, Error>) -> Void
    ) {
        let url = URL(string: "\(baseURL)/api/emails/incoming")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        
        let requestBody = EmailReplyRequest(
            threadId: threadId,
            senderId: senderId,
            content: content.trimmingCharacters(in: .whitespacesAndNewlines),
            subject: subject
        )
        
        do {
            request.httpBody = try JSONEncoder().encode(requestBody)
        } catch {
            completion(.failure(error))
            return
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let httpResponse = response as? HTTPURLResponse else {
                completion(.failure(NSError(domain: "EmailService", code: -1)))
                return
            }
            
            guard (200...299).contains(httpResponse.statusCode) else {
                if let data = data,
                   let errorResponse = try? JSONDecoder().decode([String: String].self, from: data),
                   let errorMessage = errorResponse["error"] {
                    completion(.failure(NSError(
                        domain: "EmailService",
                        code: httpResponse.statusCode,
                        userInfo: [NSLocalizedDescriptionKey: errorMessage]
                    )))
                } else {
                    completion(.failure(NSError(
                        domain: "EmailService",
                        code: httpResponse.statusCode
                    )))
                }
                return
            }
            
            guard let data = data else {
                completion(.failure(NSError(domain: "EmailService", code: -1)))
                return
            }
            
            do {
                let response = try JSONDecoder().decode(EmailReplyResponse.self, from: data)
                completion(.success(response))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
}

// Usage Example
let emailService = EmailService(
    baseURL: "https://api.patricktravel.com",
    authToken: userAuthToken
)

// Extract thread ID
let emailSubject = "[THREAD:1704067200000-abc123-def456] Case Status Update"
guard let threadId = emailService.extractThreadId(from: emailSubject) else {
    print("Could not extract thread ID")
    return
}

// Send reply
emailService.sendEmailReply(
    threadId: threadId,
    senderId: currentUserId,
    content: replyContent,
    subject: "Re: Case Status Update"
) { result in
    switch result {
    case .success(let response):
        print("Reply sent: \(response.messageId)")
        // Show success alert
    case .failure(let error):
        print("Error: \(error.localizedDescription)")
        // Show error alert
    }
}
```

### Kotlin (Android)

```kotlin
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.regex.Pattern

data class EmailReplyRequest(
    val threadId: String,
    val senderId: String,
    val content: String,
    val subject: String? = null
)

data class EmailReplyResponse(
    val success: Boolean,
    val processed: Boolean,
    val messageId: String,
    val threadId: String
)

class EmailService(
    private val baseUrl: String,
    private val authToken: String,
    private val client: OkHttpClient
) {
    
    companion object {
        private val JSON = "application/json; charset=utf-8".toMediaType()
        private val THREAD_ID_PATTERN = Pattern.compile("\\[THREAD:([^\\]]+)\\]")
    }
    
    /**
     * Extract thread ID from email subject
     */
    fun extractThreadId(subject: String): String? {
        val matcher = THREAD_ID_PATTERN.matcher(subject)
        return if (matcher.find()) {
            matcher.group(1)
        } else {
            null
        }
    }
    
    /**
     * Send email reply to backend
     */
    fun sendEmailReply(
        threadId: String,
        senderId: String,
        content: String,
        subject: String? = null,
        callback: (Result<EmailReplyResponse>) -> Unit
    ) {
        val json = JSONObject().apply {
            put("threadId", threadId)
            put("senderId", senderId)
            put("content", content.trim())
            subject?.let { put("subject", it) }
        }
        
        val requestBody = json.toString().toRequestBody(JSON)
        
        val request = Request.Builder()
            .url("$baseUrl/api/emails/incoming")
            .post(requestBody)
            .addHeader("Content-Type", "application/json")
            .addHeader("Authorization", "Bearer $authToken")
            .build()
        
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(Result.failure(e))
            }
            
            override fun onResponse(call: Call, response: Response) {
                if (!response.isSuccessful) {
                    val errorBody = response.body?.string()
                    val errorMessage = try {
                        JSONObject(errorBody ?: "").getString("error")
                    } catch (e: Exception) {
                        "Failed to send email reply"
                    }
                    callback(Result.failure(Exception(errorMessage)))
                    return
                }
                
                val responseBody = response.body?.string()
                try {
                    val jsonResponse = JSONObject(responseBody ?: "")
                    val replyResponse = EmailReplyResponse(
                        success = jsonResponse.getBoolean("success"),
                        processed = jsonResponse.getBoolean("processed"),
                        messageId = jsonResponse.getString("messageId"),
                        threadId = jsonResponse.getString("threadId")
                    )
                    callback(Result.success(replyResponse))
                } catch (e: Exception) {
                    callback(Result.failure(e))
                }
            }
        })
    }
}

// Usage Example
val emailService = EmailService(
    baseUrl = "https://api.patricktravel.com",
    authToken = userAuthToken,
    client = OkHttpClient()
)

// Extract thread ID
val emailSubject = "[THREAD:1704067200000-abc123-def456] Case Status Update"
val threadId = emailService.extractThreadId(emailSubject)
    ?: run {
        Log.e("EmailService", "Could not extract thread ID")
        return
    }

// Send reply
emailService.sendEmailReply(
    threadId = threadId,
    senderId = currentUserId,
    content = replyContent,
    subject = "Re: Case Status Update"
) { result ->
    result.onSuccess { response ->
        Log.d("EmailService", "Reply sent: ${response.messageId}")
        // Show success toast
    }.onFailure { error ->
        Log.e("EmailService", "Error: ${error.message}")
        // Show error toast
    }
}
```

---

## Error Handling

### Common Error Codes

| Status Code | Error | Description | Solution |
|------------|-------|-------------|----------|
| 400 | `Thread ID not found` | Thread ID missing or invalid | Verify email subject contains `[THREAD:...]` |
| 400 | `Email has no content` | Reply content is empty | Ensure user entered reply text |
| 400 | `Reply from unknown user` | senderId not found | Verify user is authenticated |
| 401 | `Unauthorized` | Missing/invalid auth token | Check JWT token |
| 403 | `Reply not from original recipient` | Wrong user replying | Verify senderId matches original email recipient |
| 404 | `Original message not found` | Thread ID doesn't exist | Verify threadId is correct |
| 500 | `Failed to process incoming email` | Server error | Retry or contact support |

### Error Handling Example

```typescript
async function handleEmailReply(threadId: string, senderId: string, content: string) {
  try {
    const response = await emailService.sendEmailReply(threadId, senderId, content);
    
    if (response.success) {
      // Success - update UI
      showSuccessMessage('Reply sent successfully');
      refreshEmailList();
    } else {
      showErrorMessage('Failed to send reply');
    }
  } catch (error) {
    // Handle specific error codes
    if (error.status === 400) {
      if (error.message.includes('Thread ID')) {
        showErrorMessage('Invalid email. Please try again or contact support.');
      } else if (error.message.includes('no content')) {
        showErrorMessage('Please enter a reply message.');
      } else {
        showErrorMessage('Invalid request. Please check your input.');
      }
    } else if (error.status === 401) {
      showErrorMessage('Session expired. Please log in again.');
      // Redirect to login
    } else if (error.status === 403) {
      showErrorMessage('You can only reply to emails sent to you.');
    } else if (error.status === 404) {
      showErrorMessage('Original email not found. This may be an old email.');
    } else {
      showErrorMessage('Failed to send reply. Please try again.');
      // Retry logic
    }
  }
}
```

---

## Testing

### Test Cases

1. **Valid Reply**
   - Send reply with valid threadId, senderId, and content
   - Verify success response
   - Check that message appears in dashboard

2. **Missing Thread ID**
   - Send reply without threadId or with invalid format
   - Verify 400 error response

3. **Empty Content**
   - Send reply with empty content
   - Verify 400 error response

4. **Invalid User**
   - Send reply with non-existent senderId
   - Verify 400 error response

5. **Wrong Recipient**
   - Try to reply to email you didn't receive
   - Verify 403 error response

6. **Authentication**
   - Send reply without auth token
   - Verify 401 error response

### Test Request Examples

```bash
# Valid request
curl -X POST https://api.patricktravel.com/api/emails/incoming \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "threadId": "1704067200000-abc123-def456",
    "senderId": "550e8400-e29b-41d4-a716-446655440000",
    "content": "Thank you for the update. I have a question...",
    "subject": "Re: Case Status Update"
  }'

# Missing threadId
curl -X POST https://api.patricktravel.com/api/emails/incoming \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "senderId": "550e8400-e29b-41d4-a716-446655440000",
    "content": "Reply message"
  }'
```

---

## Integration Checklist

- [ ] Extract thread ID from email subject when displaying email
- [ ] Store thread ID with email record for later use
- [ ] Implement reply UI screen
- [ ] Call `/api/emails/incoming` endpoint when user submits reply
- [ ] Handle success response and update UI
- [ ] Handle error responses appropriately
- [ ] Show user-friendly error messages
- [ ] Test with various email formats
- [ ] Test error scenarios
- [ ] Update email list after successful reply

---

## Additional Notes

### Thread ID Format

Thread IDs are generated in this format:
```
{timestamp}-{userId}-{randomString}
```

Example: `1704067200000-abc123-def456`

- `timestamp`: Unix timestamp in milliseconds
- `userId`: Shortened user ID
- `randomString`: Random alphanumeric string

### Best Practices

1. **Extract Thread ID Early**: When an email is received, extract and store the thread ID immediately
2. **Validate Before Sending**: Check that threadId exists before allowing reply
3. **Handle Errors Gracefully**: Show user-friendly error messages
4. **Retry Logic**: Implement retry for network errors (not for 4xx errors)
5. **Loading States**: Show loading indicator while sending reply
6. **Confirmation**: Confirm reply was sent successfully

### Security Considerations

- Always authenticate requests with JWT token
- Verify senderId matches authenticated user
- Don't expose thread IDs in client-side logs
- Use HTTPS for all API calls

---

## Support

If you encounter issues during integration:

1. Check the endpoint health: `GET /api/emails/incoming`
2. Verify thread ID extraction is working correctly
3. Check authentication token is valid
4. Review server logs for detailed error messages
5. Contact backend team with:
   - Thread ID being used
   - Error response details
   - Request payload (without sensitive data)

---

## Related Endpoints

- `GET /api/emails` - Get list of emails (can filter by `direction=incoming`)
- `GET /api/emails/[id]` - Get specific email details
- `PUT /api/emails/[id]` - Mark email as read


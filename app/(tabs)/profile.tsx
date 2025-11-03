// import React, { useState, useCallback } from 'react';
// import {
//   View,
//   StyleSheet,
//   ScrollView,
//   Alert,
//   Text,
//   TouchableOpacity,
//   Platform,
// } from 'react-native';
// import { Avatar, Dialog, Portal } from 'react-native-paper';
// // import { LinearGradient } from 'expo-linear-gradient';
// import { useRouter } from 'expo-router';
// import { useTranslation } from 'react-i18next';
// import { MaterialCommunityIcons } from '@expo/vector-icons';
// import Animated, { FadeInDown } from 'react-native-reanimated';
// import { useAuth } from '../../features/auth/hooks/useAuth';
// import { Card, Button } from '../../components/ui';
// import { ModernHeader } from '../../components/ui/ModernHeader';
// import { TouchDetector } from '../../components/ui/TouchDetector';
// import { SPACING } from '../../lib/constants';
// import { toast } from '../../lib/services/toast';
// import { useThemeColors } from '../../lib/theme/ThemeContext';

// export default function ProfileScreen() {
//   const { t } = useTranslation();
//   const router = useRouter();
//   const { user, logout } = useAuth();
//   const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
//   const colors = useThemeColors();

//   const handleLogout = useCallback(async () => {
//     setLogoutDialogVisible(false);
//     await logout();
//     router.replace('/(auth)/login');
//   }, [logout, router]);

//   const handleDeleteAccount = useCallback(() => {
//     // Keep Alert for confirmation (critical destructive action)
//     Alert.alert(t('profile.deleteAccount'), t('profile.confirmDelete'), [
//       { text: t('common.cancel'), style: 'cancel' },
//       {
//         text: t('common.delete'),
//         style: 'destructive',
//         onPress: () => {
//           // TODO: Implement delete account logic
//         },
//       },
//     ]);
//   }, [t]);

//   const MenuCard = useCallback(
//     ({ icon, title, description, onPress, danger = false }: any) => (
//       <TouchableOpacity onPress={onPress}>
//         <Card style={styles.menuCard}>
//           <View style={styles.menuContent}>
//             <View
//               style={[
//                 styles.iconContainer,
//                 { backgroundColor: danger ? colors.error + '15' : colors.primary + '15' },
//               ]}
//             >
//               <MaterialCommunityIcons
//                 name={icon}
//                 size={24}
//                 color={danger ? colors.error : colors.primary}
//               />
//             </View>
//             <View style={styles.menuTextContainer}>
//               <Text
//                 style={[styles.menuTitle, { color: danger ? colors.error : colors.text }]}
//               >
//                 {title}
//               </Text>
//               {description && (
//                 <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>{description}</Text>
//               )}
//             </View>
//             <MaterialCommunityIcons
//               name="chevron-right"
//               size={20}
//               color={colors.textSecondary}
//             />
//           </View>
//         </Card>
//       </TouchableOpacity>
//     ),
//     [colors]
//   );

//   return (
//     <TouchDetector>
//       <View style={[styles.container, { backgroundColor: colors.background }]}>
//       {/* Modern Profile Header */}
//       <ModernHeader
//         variant="gradient"
//         gradientColors={[colors.primary, '#7A9BB8', '#94B5A0']}
//         title="Profile"
//         subtitle={`${user?.firstName} ${user?.lastName}`}
//         showProfileButton
//         onProfilePress={() => router.push('/profile/edit')}
//         rightActions={
//           <TouchableOpacity
//             style={styles.headerAction}
//             onPress={() => router.push('/profile/settings')}
//           >
//             <MaterialCommunityIcons
//               name="cog"
//               size={24}
//               color="#FFF"
//             />
//           </TouchableOpacity>
//         }
//       >
//         {/* Profile Avatar Section */}
//         <View style={styles.profileSection}>
//           <Animated.View entering={FadeInDown.delay(200).duration(600)}>
//             <View style={styles.avatarContainer}>
//               <Avatar.Text
//                 size={120}
//                 label={
//                   user?.firstName && user?.lastName
//                     ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
//                     : user?.email?.charAt(0)?.toUpperCase() || 'U'
//                 }
//                 style={styles.avatar}
//                 labelStyle={[styles.avatarLabel, { color: colors.primary }]}
//               />
//             </View>
//           </Animated.View>
          
//           <Animated.View entering={FadeInDown.delay(400).duration(600)}>
//             <Text style={styles.profileEmail}>{user?.email}</Text>
//             {user?.phone && <Text style={styles.profilePhone}>{user.phone}</Text>}
//           </Animated.View>
//         </View>
//       </ModernHeader>

//       <ScrollView
//         style={{ flex: 1 }}
//         contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 100 : 80 }}
//       >

//       <View style={styles.section}>
//         <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('profile.account')}</Text>
//         <Animated.View entering={FadeInDown.delay(100).duration(400)}>
//           <MenuCard
//             icon="account-edit"
//             title={t('profile.editProfile')}
//             description={t('profile.updateInfo')}
//             onPress={() => router.push('/profile/edit')}
//           />
//         </Animated.View>
//         <Animated.View entering={FadeInDown.delay(150).duration(400)}>
//           <MenuCard
//             icon="lock-reset"
//             title={t('profile.changePassword')}
//             description={t('profile.updatePassword')}
//             onPress={() => router.push('/profile/change-password')}
//           />
//         </Animated.View>
//         <Animated.View entering={FadeInDown.delay(200).duration(400)}>
//           <MenuCard
//             icon="bell"
//             title={t('profile.notificationPreferences')}
//             description={t('profile.manageNotifications')}
//             onPress={() => router.push('/profile/notifications')}
//           />
//         </Animated.View>
//         <Animated.View entering={FadeInDown.delay(250).duration(400)}>
//           <MenuCard
//             icon="cog"
//             title={t('profile.settings')}
//             description={t('profile.appPreferences')}
//             onPress={() => router.push('/profile/settings')}
//           />
//         </Animated.View>
//       </View>

//       <View style={styles.section}>
//         <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('profile.helpAndSupport')}</Text>
//         <Animated.View entering={FadeInDown.delay(300).duration(400)}>
//           <MenuCard
//             icon="help-circle"
//             title={t('profile.faq')}
//             description={t('profile.faqDesc')}
//             onPress={() => router.push('/help/faq')}
//           />
//         </Animated.View>
//         <Animated.View entering={FadeInDown.delay(350).duration(400)}>
//           <MenuCard
//             icon="email"
//             title={t('profile.contactSupport')}
//             description={t('profile.contactDesc')}
//             onPress={() => router.push('/help/contact')}
//           />
//         </Animated.View>
//       </View>

//       <View style={styles.section}>
//         <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('profile.privacy')}</Text>
//         <Animated.View entering={FadeInDown.delay(400).duration(400)}>
//           <MenuCard
//             icon="shield-check"
//             title="Privacy Policy"
//             description="View our privacy policy and data protection"
//             onPress={() => router.push('/(auth)/privacy-policy')}
//           />
//         </Animated.View>
//         <Animated.View entering={FadeInDown.delay(425).duration(400)}>
//           <MenuCard
//             icon="file-document"
//             title="Terms & Conditions"
//             description="View our terms of service"
//             onPress={() => router.push('/(auth)/terms')}
//           />
//         </Animated.View>
//         <Animated.View entering={FadeInDown.delay(450).duration(400)}>
//           <MenuCard
//             icon="download"
//             title={t('profile.exportData')}
//             description={t('profile.exportDesc')}
//             onPress={() =>
//               toast.info({
//                 title: 'Feature Coming Soon',
//                 message: 'Data export will be available soon',
//               })
//             }
//           />
//         </Animated.View>
//         <Animated.View entering={FadeInDown.delay(475).duration(400)}>
//           <MenuCard
//             icon="delete"
//             title={t('profile.deleteAccount')}
//             description={t('profile.deleteDesc')}
//             onPress={handleDeleteAccount}
//             danger
//           />
//         </Animated.View>
//       </View>

//       <Animated.View
//         entering={FadeInDown.delay(500).duration(400)}
//         style={styles.footer}
//       >
//         <Button
//           title={t('profile.logout')}
//           onPress={() => setLogoutDialogVisible(true)}
//           icon="logout"
//           variant="danger"
//           fullWidth
//         />
//         <Text style={[styles.version, { color: colors.textSecondary }]}>{t('common.version')} 1.0.0</Text>
//       </Animated.View>

//       <Portal>
//         <Dialog
//           visible={logoutDialogVisible}
//           onDismiss={() => setLogoutDialogVisible(false)}
//         >
//           <Dialog.Title>{t('profile.logout')}</Dialog.Title>
//           <Dialog.Content>
//             <Text>{t('profile.confirmLogout')}</Text>
//           </Dialog.Content>
//           <Dialog.Actions>
//             <Button
//               title={t('common.cancel')}
//               variant="ghost"
//               onPress={() => setLogoutDialogVisible(false)}
//             />
//             <Button
//               title={t('profile.logout')}
//               variant="danger"
//               onPress={handleLogout}
//             />
//           </Dialog.Actions>
//         </Dialog>
//       </Portal>
//       </ScrollView>
//     </View>
//     </TouchDetector>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   headerAction: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginLeft: SPACING.sm,
//   },
//   profileSection: {
//     alignItems: 'center',
//     paddingHorizontal: SPACING.lg,
//     paddingBottom: SPACING.lg,
//   },
//   profileEmail: {
//     fontSize: 16,
//     color: 'rgba(255,255,255,0.9)',
//     marginTop: SPACING.sm,
//     textAlign: 'center',
//   },
//   profilePhone: {
//     fontSize: 14,
//     color: 'rgba(255,255,255,0.7)',
//     marginTop: SPACING.xs,
//     textAlign: 'center',
//   },
//   headerGradient: {
//     paddingTop: Platform.OS === 'ios' ? 70 : 50,
//     paddingBottom: 40,
//     borderBottomLeftRadius: 35,
//     borderBottomRightRadius: 35,
//   },
//   header: {
//     alignItems: 'center',
//     paddingHorizontal: SPACING.xl,
//   },
//   avatarContainer: {
//     marginBottom: SPACING.md,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 6 },
//     shadowOpacity: 0.3,
//     shadowRadius: 12,
//     elevation: 10,
//   },
//   avatar: {
//     backgroundColor: 'rgba(255,255,255,0.95)',
//     borderWidth: 4,
//     borderColor: 'rgba(255,255,255,0.4)',
//   },
//   avatarLabel: {
//     fontSize: 42,
//     fontWeight: '700',
//   },
//   name: {
//     fontSize: 26,
//     fontWeight: '700',
//     color: '#FFF',
//     marginBottom: 6,
//     textShadowColor: 'rgba(0, 0, 0, 0.15)',
//     textShadowOffset: { width: 0, height: 1 },
//     textShadowRadius: 3,
//   },
//   email: {
//     fontSize: 15,
//     color: 'rgba(255,255,255,0.95)',
//     marginBottom: 4,
//   },
//   phone: {
//     fontSize: 15,
//     color: 'rgba(255,255,255,0.9)',
//   },
//   section: {
//     padding: SPACING.md,
//     paddingTop: SPACING.lg,
//   },
//   sectionTitle: {
//     fontSize: 13,
//     fontWeight: '600',
//     textTransform: 'uppercase',
//     marginBottom: SPACING.sm,
//     marginLeft: SPACING.xs,
//   },
//   menuCard: {
//     marginBottom: SPACING.sm,
//     borderRadius: 16,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.08,
//     shadowRadius: 8,
//     elevation: 3,
//   },
//   menuContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: SPACING.md,
//   },
//   iconContainer: {
//     width: 52,
//     height: 52,
//     borderRadius: 14,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginRight: SPACING.md,
//   },
//   menuTextContainer: {
//     flex: 1,
//   },
//   menuTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     marginBottom: 2,
//   },
//   menuDescription: {
//     fontSize: 13,
//   },
//   footer: {
//     padding: SPACING.lg,
//     paddingTop: SPACING.xl,
//     alignItems: 'center',
//   },
//   version: {
//     fontSize: 12,
//     marginTop: SPACING.md,
//   },
// });


// -----------



// import React, { useState, useCallback } from 'react';
// import {
//   View,
//   StyleSheet,
//   ScrollView,
//   Alert,
//   Text,
//   TouchableOpacity,
//   Platform,
// } from 'react-native';
// import { Avatar, Dialog, Portal } from 'react-native-paper';
// import { useRouter } from 'expo-router';
// import { useTranslation } from 'react-i18next';
// import { MaterialCommunityIcons } from '@expo/vector-icons';
// import Animated, { FadeInDown } from 'react-native-reanimated';
// import { useAuth } from '../../features/auth/hooks/useAuth';
// import { Card, Button } from '../../components/ui';
// import { ModernHeader } from '../../components/ui/ModernHeader';
// import { TouchDetector } from '../../components/ui/TouchDetector';
// import { SPACING } from '../../lib/constants';
// import { toast } from '../../lib/services/toast';
// import { useThemeColors } from '../../lib/theme/ThemeContext';

// export default function ProfileScreen() {
//   const { t } = useTranslation();
//   const router = useRouter();
//   const { user, logout } = useAuth();
//   const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
//   const colors = useThemeColors();

//   const handleLogout = useCallback(async () => {
//     setLogoutDialogVisible(false);
//     await logout();
//     router.replace('/(auth)/login');
//   }, [logout, router]);

//   const handleDeleteAccount = useCallback(() => {
//     Alert.alert(t('profile.deleteAccount'), t('profile.confirmDelete'), [
//       { text: t('common.cancel'), style: 'cancel' },
//       {
//         text: t('common.delete'),
//         style: 'destructive',
//         onPress: () => {
//           // TODO: Implement delete account logic
//         },
//       },
//     ]);
//   }, [t]);

//   const MenuCard = useCallback(
//     ({ icon, title, description, onPress, danger = false }: any) => (
//       <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
//         <Card style={styles.menuCard}>
//           <View style={styles.menuContent}>
//             <View
//               style={[
//                 styles.iconContainer,
//                 { backgroundColor: danger ? colors.error + '15' : colors.primary + '15' },
//               ]}
//             >
//               <MaterialCommunityIcons
//                 name={icon}
//                 size={24}
//                 color={danger ? colors.error : colors.primary}
//               />
//             </View>
//             <View style={styles.menuTextContainer}>
//               <Text
//                 style={[styles.menuTitle, { color: danger ? colors.error : colors.text }]}
//               >
//                 {title}
//               </Text>
//               {description && (
//                 <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>
//                   {description}
//                 </Text>
//               )}
//             </View>
//             <MaterialCommunityIcons
//               name="chevron-right"
//               size={20}
//               color={colors.textSecondary}
//             />
//           </View>
//         </Card>
//       </TouchableOpacity>
//     ),
//     [colors]
//   );

//   return (
//     <TouchDetector>
//       <View style={[styles.container, { backgroundColor: colors.background }]}>
//         {/* Modern Profile Header */}
//         <ModernHeader
//           variant="gradient"
//           gradientColors={[colors.primary, '#7A9BB8', '#94B5A0']}
//           title="Profile"
//           subtitle={`${user?.firstName} ${user?.lastName}`}
//           showProfileButton
//           onProfilePress={() => router.push('/profile/edit')}
//           rightActions={
//             <TouchableOpacity
//               style={styles.headerAction}
//               onPress={() => router.push('/profile/settings')}
//             >
//               <MaterialCommunityIcons name="cog" size={24} color="#FFF" />
//             </TouchableOpacity>
//           }
//         />

//         <ScrollView
//           style={styles.scrollView}
//           contentContainerStyle={styles.scrollContent}
//           showsVerticalScrollIndicator={false}
//         >
//           {/* Profile Card with User Badge - Elevated Design */}
//           <Animated.View
//             entering={FadeInDown.delay(100).duration(600)}
//             style={styles.profileCardContainer}
//           >
//             <View style={styles.profileCard}>
//               {/* Avatar Badge */}
//               <View style={styles.avatarBadge}>
//                 <View style={styles.avatarGlow}>
//                   <Avatar.Text
//                     size={100}
//                     label={
//                       user?.firstName && user?.lastName
//                         ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
//                         : user?.email?.charAt(0)?.toUpperCase() || 'U'
//                     }
//                     style={[styles.avatar, { backgroundColor: colors.primary }]}
//                     labelStyle={styles.avatarLabel}
//                   />
//                 </View>
//                 <TouchableOpacity style={styles.editBadge} activeOpacity={0.8}>
//                   <MaterialCommunityIcons name="camera" size={18} color="#FFF" />
//                 </TouchableOpacity>
//               </View>

//               {/* User Info */}
//               <View style={styles.userInfo}>
//                 <Text style={[styles.userName, { color: colors.text }]}>
//                   {user?.firstName} {user?.lastName}
//                 </Text>
//                 <View style={styles.userDetails}>
//                   <View style={styles.detailRow}>
//                     <MaterialCommunityIcons
//                       name="email-outline"
//                       size={16}
//                       color={colors.textSecondary}
//                     />
//                     <Text style={[styles.detailText, { color: colors.textSecondary }]}>
//                       {user?.email}
//                     </Text>
//                   </View>
//                   {user?.phone && (
//                     <View style={styles.detailRow}>
//                       <MaterialCommunityIcons
//                         name="phone-outline"
//                         size={16}
//                         color={colors.textSecondary}
//                       />
//                       <Text style={[styles.detailText, { color: colors.textSecondary }]}>
//                         {user.phone}
//                       </Text>
//                     </View>
//                   )}
//                 </View>
//               </View>

//               {/* Quick Stats */}
//               <View style={styles.statsContainer}>
//                 <View style={styles.statItem}>
//                   <Text style={[styles.statValue, { color: colors.primary }]}>12</Text>
//                   <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
//                     Cases
//                   </Text>
//                 </View>
//                 <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
//                 <View style={styles.statItem}>
//                   <Text style={[styles.statValue, { color: colors.success }]}>8</Text>
//                   <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
//                     Active
//                   </Text>
//                 </View>
//                 <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
//                 <View style={styles.statItem}>
//                   <Text style={[styles.statValue, { color: colors.warning }]}>4</Text>
//                   <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
//                     Pending
//                   </Text>
//                 </View>
//               </View>
//             </View>
//           </Animated.View>

//           {/* Menu Sections */}
//           <View style={styles.section}>
//             <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
//               {t('profile.account')}
//             </Text>
//             <Animated.View entering={FadeInDown.delay(200).duration(400)}>
//               <MenuCard
//                 icon="account-edit"
//                 title={t('profile.editProfile')}
//                 description={t('profile.updateInfo')}
//                 onPress={() => router.push('/profile/edit')}
//               />
//             </Animated.View>
//             <Animated.View entering={FadeInDown.delay(250).duration(400)}>
//               <MenuCard
//                 icon="lock-reset"
//                 title={t('profile.changePassword')}
//                 description={t('profile.updatePassword')}
//                 onPress={() => router.push('/profile/change-password')}
//               />
//             </Animated.View>
//             <Animated.View entering={FadeInDown.delay(300).duration(400)}>
//               <MenuCard
//                 icon="bell"
//                 title={t('profile.notificationPreferences')}
//                 description={t('profile.manageNotifications')}
//                 onPress={() => router.push('/profile/notifications')}
//               />
//             </Animated.View>
//             <Animated.View entering={FadeInDown.delay(350).duration(400)}>
//               <MenuCard
//                 icon="cog"
//                 title={t('profile.settings')}
//                 description={t('profile.appPreferences')}
//                 onPress={() => router.push('/profile/settings')}
//               />
//             </Animated.View>
//           </View>

//           <View style={styles.section}>
//             <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
//               {t('profile.helpAndSupport')}
//             </Text>
//             <Animated.View entering={FadeInDown.delay(400).duration(400)}>
//               <MenuCard
//                 icon="help-circle"
//                 title={t('profile.faq')}
//                 description={t('profile.faqDesc')}
//                 onPress={() => router.push('/help/faq')}
//               />
//             </Animated.View>
//             <Animated.View entering={FadeInDown.delay(450).duration(400)}>
//               <MenuCard
//                 icon="email"
//                 title={t('profile.contactSupport')}
//                 description={t('profile.contactDesc')}
//                 onPress={() => router.push('/help/contact')}
//               />
//             </Animated.View>
//           </View>

//           <View style={styles.section}>
//             <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
//               {t('profile.privacy')}
//             </Text>
//             <Animated.View entering={FadeInDown.delay(500).duration(400)}>
//               <MenuCard
//                 icon="shield-check"
//                 title="Privacy Policy"
//                 description="View our privacy policy and data protection"
//                 onPress={() => router.push('/(auth)/privacy-policy')}
//               />
//             </Animated.View>
//             <Animated.View entering={FadeInDown.delay(525).duration(400)}>
//               <MenuCard
//                 icon="file-document"
//                 title="Terms & Conditions"
//                 description="View our terms of service"
//                 onPress={() => router.push('/(auth)/terms')}
//               />
//             </Animated.View>
//             <Animated.View entering={FadeInDown.delay(550).duration(400)}>
//               <MenuCard
//                 icon="download"
//                 title={t('profile.exportData')}
//                 description={t('profile.exportDesc')}
//                 onPress={() =>
//                   toast.info({
//                     title: 'Feature Coming Soon',
//                     message: 'Data export will be available soon',
//                   })
//                 }
//               />
//             </Animated.View>
//             <Animated.View entering={FadeInDown.delay(575).duration(400)}>
//               <MenuCard
//                 icon="delete"
//                 title={t('profile.deleteAccount')}
//                 description={t('profile.deleteDesc')}
//                 onPress={handleDeleteAccount}
//                 danger
//               />
//             </Animated.View>
//           </View>

//           <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.footer}>
//             <Button
//               title={t('profile.logout')}
//               onPress={() => setLogoutDialogVisible(true)}
//               icon="logout"
//               variant="danger"
//               fullWidth
//             />
//             <Text style={[styles.version, { color: colors.textSecondary }]}>
//               {t('common.version')} 1.0.0
//             </Text>
//           </Animated.View>
//         </ScrollView>

//         <Portal>
//           <Dialog visible={logoutDialogVisible} onDismiss={() => setLogoutDialogVisible(false)}>
//             <Dialog.Title>{t('profile.logout')}</Dialog.Title>
//             <Dialog.Content>
//               <Text>{t('profile.confirmLogout')}</Text>
//             </Dialog.Content>
//             <Dialog.Actions>
//               <Button
//                 title={t('common.cancel')}
//                 variant="ghost"
//                 onPress={() => setLogoutDialogVisible(false)}
//               />
//               <Button
//                 title={t('profile.logout')}
//                 variant="danger"
//                 onPress={handleLogout}
//               />
//             </Dialog.Actions>
//           </Dialog>
//         </Portal>
//       </View>
//     </TouchDetector>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   scrollView: {
//     flex: 1,
//   },
//   scrollContent: {
//     paddingBottom: Platform.OS === 'ios' ? 100 : 80,
//   },
//   headerAction: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginLeft: SPACING.sm,
//   },

//   // Profile Card - Elevated Design
//   profileCardContainer: {
//     paddingHorizontal: SPACING.lg,
//     paddingTop: SPACING.xl,
//     marginBottom: SPACING.md,
//   },
//   profileCard: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 24,
//     padding: SPACING.xl,
//     alignItems: 'center',
//     shadowColor: '#5B8BA8',
//     shadowOffset: { width: 0, height: 8 },
//     shadowOpacity: 0.12,
//     shadowRadius: 16,
//     elevation: 8,
//   },
//   avatarBadge: {
//     position: 'relative',
//     marginBottom: SPACING.lg,
//   },
//   avatarGlow: {
//     padding: 4,
//     borderRadius: 60,
//     backgroundColor: 'rgba(91, 139, 168, 0.1)',
//   },
//   avatar: {
//     borderWidth: 4,
//     borderColor: '#FFFFFF',
//   },
//   avatarLabel: {
//     fontSize: 38,
//     fontWeight: '700',
//     color: '#FFFFFF',
//   },
//   editBadge: {
//     position: 'absolute',
//     bottom: 0,
//     right: 0,
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     backgroundColor: '#5B8BA8',
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 3,
//     borderColor: '#FFFFFF',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   userInfo: {
//     alignItems: 'center',
//     marginBottom: SPACING.lg,
//   },
//   userName: {
//     fontSize: 24,
//     fontWeight: '700',
//     marginBottom: SPACING.sm,
//     letterSpacing: -0.5,
//   },
//   userDetails: {
//     alignItems: 'center',
//     gap: SPACING.xs,
//   },
//   detailRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: SPACING.xs,
//   },
//   detailText: {
//     fontSize: 14,
//     fontWeight: '500',
//   },
//   statsContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-around',
//     width: '100%',
//     paddingTop: SPACING.lg,
//     borderTopWidth: 1,
//     borderTopColor: '#F0F3F5',
//   },
//   statItem: {
//     alignItems: 'center',
//     flex: 1,
//   },
//   statValue: {
//     fontSize: 24,
//     fontWeight: '700',
//     marginBottom: 4,
//     letterSpacing: -0.5,
//   },
//   statLabel: {
//     fontSize: 12,
//     fontWeight: '600',
//     textTransform: 'uppercase',
//     letterSpacing: 0.5,
//   },
//   statDivider: {
//     width: 1,
//     height: 40,
//   },

//   // Menu Sections
//   section: {
//     padding: SPACING.md,
//     paddingTop: SPACING.lg,
//   },
//   sectionTitle: {
//     fontSize: 13,
//     fontWeight: '700',
//     textTransform: 'uppercase',
//     marginBottom: SPACING.md,
//     marginLeft: SPACING.xs,
//     letterSpacing: 1,
//   },
//   menuCard: {
//     marginBottom: SPACING.sm,
//     borderRadius: 16,
//     shadowColor: '#5B8BA8',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.06,
//     shadowRadius: 8,
//     elevation: 2,
//   },
//   menuContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: SPACING.md,
//   },
//   iconContainer: {
//     width: 48,
//     height: 48,
//     borderRadius: 12,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginRight: SPACING.md,
//   },
//   menuTextContainer: {
//     flex: 1,
//   },
//   menuTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     marginBottom: 4,
//     letterSpacing: -0.2,
//   },
//   menuDescription: {
//     fontSize: 13,
//     fontWeight: '500',
//   },
//   footer: {
//     padding: SPACING.lg,
//     paddingTop: SPACING.xl,
//     alignItems: 'center',
//   },
//   version: {
//     fontSize: 12,
//     marginTop: SPACING.md,
//     fontWeight: '500',
//   },
// });


// ------------

import React, { useState, useCallback, useEffect, useMemo, memo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Avatar, Dialog, Portal } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { Card, Button } from '../../components/ui';
import { TouchDetector } from '../../components/ui/TouchDetector';
import { SPACING } from '../../lib/constants';
import { toast } from '../../lib/services/toast';
import { useThemeColors } from '../../lib/theme/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { uploadFileToAPI } from '../../lib/services/fileUpload';
import { userApi } from '../../lib/api/user.api';
import { useAuthStore } from '../../stores/auth/authStore';
import { useTabBarScroll } from '../../lib/hooks/useTabBarScroll';
import { logger } from '../../lib/utils/logger';
import { Alert } from '../../lib/utils/alert';
import { DashboardStats } from '../../lib/types';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, logout, updateUser, deleteAccount, isLoading } = useAuth();
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [deleteAccountDialogVisible, setDeleteAccountDialogVisible] = useState(false);
  const colors = useThemeColors();
  const scrollProps = useTabBarScroll();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalCases: 0,
    activeCases: 0,
    pendingDocuments: 0,
    unreadMessages: 0,
  });
  const isFetchingStatsRef = useRef(false);

  // Memoize computed values for performance
  const userFullName = useMemo(
    () => (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : ''),
    [user?.firstName, user?.lastName]
  );

  const avatarLabel = useMemo(() => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    }
    return user?.email?.charAt(0)?.toUpperCase() || 'U';
  }, [user?.firstName, user?.lastName, user?.email]);

  const avatarUri = useMemo(
    () => profileImage || user?.profilePicture || null,
    [profileImage, user?.profilePicture]
  );

  const gradientColors = useMemo(
    () => [colors.primary, colors.secondary, colors.accent] as const,
    [colors.primary, colors.secondary, colors.accent]
  );

  // Sync profileImage with user?.profilePicture when user data changes
  // This ensures the avatar displays the persisted profile picture from the database
  useEffect(() => {
    if (user?.profilePicture) {
      setProfileImage(user.profilePicture);
    } else if (user && !user.profilePicture) {
      // Clear profileImage if user exists but has no profile picture
      setProfileImage(null);
    }
  }, [user?.profilePicture, user?.id]);

  // Fetch dashboard stats
  const fetchDashboardStats = useCallback(async () => {
    if (isFetchingStatsRef.current) return; // Prevent concurrent calls

    isFetchingStatsRef.current = true;
    try {
      const response = await userApi.getDashboardStats();
      if (response.success && response.data) {
        // Handle both simple and detailed dashboard stats response
        const data = response.data;
        setStats({
          totalCases: (data as any).cases?.total || data.totalCases || 0,
          activeCases: (data as any).cases?.active || data.activeCases || 0,
          pendingDocuments:
            (data as any).documents?.pending || data.pendingDocuments || 0,
          unreadMessages:
            (data as any).notifications?.unread || data.unreadMessages || 0,
        });
      }
    } catch (error) {
      logger.error('Failed to fetch dashboard stats in profile', error);
    } finally {
      isFetchingStatsRef.current = false;
    }
  }, []);

  // Fetch stats when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchDashboardStats();
    }, [fetchDashboardStats])
  );

  const handleLogout = useCallback(async () => {
    setLogoutDialogVisible(false);
    await logout();
    router.replace('/(auth)/login');
  }, [logout, router]);

  const handleDeleteAccount = useCallback(() => {
    setDeleteAccountDialogVisible(true);
  }, []);

  const handleConfirmDeleteAccount = useCallback(async () => {
    setDeleteAccountDialogVisible(false);
    try {
      const success = await deleteAccount();
      if (success) {
        // Navigate to login screen after successful deletion
        router.replace('/(auth)/login');
      } else {
        // Show error toast if deletion failed
        toast.error({
          title: t('common.error'),
          message: t('profile.deleteAccountFailed'),
        });
      }
    } catch (error) {
      logger.error('Delete account error in profile', error);
      toast.error({
        title: t('common.error'),
        message: t('profile.deleteAccountFailed'),
      });
    }
  }, [deleteAccount, router, t]);

  const handleImageUpload = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      setIsUploadingImage(true);

      // Upload file to API
      const uploadResult = await uploadFileToAPI(
        asset.uri,
        asset.fileName || `profile_${Date.now()}.jpg`,
        asset.mimeType || 'image/jpeg'
      );

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      const newProfilePictureUrl = uploadResult.url;

      // Optimistic UI update - show immediately
      setProfileImage(newProfilePictureUrl);
      useAuthStore.getState().updateUserOptimistic({ profilePicture: newProfilePictureUrl });

      // Update profile with new image URL in database
      const updateResp = await userApi.updateProfile({ profilePicture: newProfilePictureUrl });

      if (!updateResp.success) {
        throw new Error(updateResp.error || 'Failed to save profile picture to database');
      }

      if (!updateResp.data) {
        throw new Error('Server did not return updated user data');
      }

      // Update user store with response from server (ensures persistence)
      const updatedUser = updateResp.data;

      // Verify the profilePicture was actually saved
      if (!updatedUser.profilePicture || updatedUser.profilePicture !== newProfilePictureUrl) {
        logger.warn('Profile picture URL mismatch', {
          expected: newProfilePictureUrl,
          received: updatedUser.profilePicture,
        });
      }

      await updateUser(updatedUser);

      // Ensure profileImage state matches the persisted value from database
      setProfileImage(updatedUser.profilePicture || null);

      logger.info('Profile picture updated successfully', {
        userId: user?.id,
        profilePictureUrl: updatedUser.profilePicture,
      });

      toast.success({
        title: t('common.success'),
        message: t('profile.photoUpdated') || 'Profile photo updated successfully!'
      });
    } catch (error: any) {
      // Rollback optimistic update on error
      useAuthStore.getState().revertUserUpdate();

      // Reset profileImage to the persisted value from user store
      if (user?.profilePicture) {
        setProfileImage(user.profilePicture);
      } else {
        setProfileImage(null);
      }

      logger.error('Failed to upload profile image', error);
      toast.error({
        title: t('common.error'),
        message: error.message || t('profile.failedToChangePhoto'),
      });
    } finally {
      setIsUploadingImage(false);
    }
  }, [t, updateUser, user?.id, user?.profilePicture]);

  const handleChangeProfilePhoto = useCallback(async () => {
    try {
      Alert.alert(
        t('profile.changeProfilePhoto'),
        t('profile.choosePhotoOption'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('profile.takePhoto'),
            onPress: async () => {
              try {
                // Request camera permissions
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert(
                    t('profile.noPermissions'),
                    t('profile.cameraPermissionNeeded'),
                    [
                      { text: t('profile.dismiss') },
                      { text: t('profile.openSettings'), onPress: () => Linking.openSettings() },
                    ]
                  );
                  return;
                }

                // Launch camera
                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.8,
                });

                if (result.canceled || !result.assets[0]) {
                  return;
                }

                await handleImageUpload(result.assets[0]);
              } catch (error: any) {
                logger.error('Error taking photo', error);
                Alert.alert(t('common.error'), error.message || t('profile.failedToTakePhoto'));
              }
            },
          },
          {
            text: t('profile.chooseFromLibrary'),
            onPress: async () => {
              try {
                // Request media library permissions
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert(
                    t('profile.noPermissions'),
                    t('profile.photosPermissionNeeded'),
                    [
                      { text: t('profile.dismiss') },
                      { text: t('profile.openSettings'), onPress: () => Linking.openSettings() },
                    ]
                  );
                  return;
                }

                // Launch image picker
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.8,
                });

                if (result.canceled || !result.assets[0]) {
                  return;
                }

                await handleImageUpload(result.assets[0]);
              } catch (error: any) {
                logger.error('Error picking image', error);
                Alert.alert(t('common.error'), error.message || t('profile.failedToPickImage'));
              }
            },
          },
        ]
      );
    } catch (error) {
      logger.error('Error changing profile photo', error);
      Alert.alert(t('common.error'), t('profile.failedToChangePhoto'));
    }
  }, [t, handleImageUpload]);

  // Memoized MenuCard component to prevent unnecessary re-renders
  const MenuCard = memo(
    ({ icon, title, description, onPress, danger = false }: any) => (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Card style={styles.menuCard}>
          <View style={styles.menuContent}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: danger ? colors.error + '15' : colors.primary + '15' },
              ]}
            >
              <MaterialCommunityIcons
                name={icon}
                size={24}
                color={danger ? colors.error : colors.primary}
              />
            </View>
            <View style={styles.menuTextContainer}>
              <Text
                style={[styles.menuTitle, { color: danger ? colors.error : colors.text }]}
              >
                {title}
              </Text>
              {description && (
                <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>
                  {description}
                </Text>
              )}
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </View>
        </Card>
      </TouchableOpacity>
    )
  );

  // Memoize navigation handlers to prevent unnecessary re-renders
  const handleNavigateToSettings = useCallback(() => {
    router.push('/profile/settings');
  }, [router]);

  const handleNavigateToEdit = useCallback(() => {
    router.push('/profile/edit');
  }, [router]);

  const handleNavigateToChangePassword = useCallback(() => {
    router.push('/profile/change-password');
  }, [router]);

  const handleNavigateToNotifications = useCallback(() => {
    router.push('/profile/notifications');
  }, [router]);

  const handleNavigateToFAQ = useCallback(() => {
    router.push('/help/faq');
  }, [router]);

  const handleNavigateToContact = useCallback(() => {
    router.push('/help/contact');
  }, [router]);

  const handleNavigateToPrivacyPolicy = useCallback(() => {
    router.push('/(auth)/privacy-policy');
  }, [router]);

  const handleNavigateToTerms = useCallback(() => {
    router.push('/(auth)/terms');
  }, [router]);

  const handleShowExportDataToast = useCallback(() => {
    toast.info({
      title: 'Feature Coming Soon',
      message: 'Data export will be available soon',
    });
  }, []);

  const handleShowLogoutDialog = useCallback(() => {
    setLogoutDialogVisible(true);
  }, []);

  const handleDismissLogoutDialog = useCallback(() => {
    setLogoutDialogVisible(false);
  }, []);

  // Dynamic theme-aware styles - memoized to prevent recalculation
  const dynamicStyles = useMemo(
    () => ({
      profileInfoCard: {
        ...styles.profileInfoCard,
        backgroundColor: colors.surface,
      },
      statsContainer: {
        ...styles.statsContainer,
        borderTopColor: colors.border,
      },
    }),
    [colors.surface, colors.border]
  );

  return (
    <TouchDetector>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={scrollProps.onScroll}
          scrollEventThrottle={scrollProps.scrollEventThrottle}
        >
          {/* Profile Header Card - Now serves as the header */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(600)}
            style={styles.profileHeaderContainer}
          >
            {/* Background Gradient */}
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              {/* Settings Icon */}
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={handleNavigateToSettings}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="cog-outline" size={24} color="#FFF" />
              </TouchableOpacity>

              {/* Avatar Badge */}
              <View style={styles.headerAvatarContainer}>
                <View style={styles.avatarGlow}>
                  {avatarUri ? (
                    <Avatar.Image
                      size={110}
                      source={{ uri: avatarUri }}
                      style={styles.headerAvatar}
                    />
                  ) : (
                    <Avatar.Text
                      size={110}
                        label={avatarLabel}
                      style={styles.headerAvatar}
                      labelStyle={[styles.headerAvatarLabel, { color: colors.primary }]}
                    />
                  )}
                </View>
                <TouchableOpacity 
                  style={[styles.editBadge, { backgroundColor: colors.primary }]}
                  activeOpacity={0.8}
                  onPress={handleChangeProfilePhoto}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <MaterialCommunityIcons name="loading" size={18} color="#FFF" />
                  ) : (
                    <MaterialCommunityIcons name="camera" size={18} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>

              {/* User Name */}
              <Text style={styles.headerUserName}>
                {userFullName}
              </Text>
            </LinearGradient>

            {/* White Card Section */}
            <View style={dynamicStyles.profileInfoCard}>
              {/* User Details */}
              <View style={styles.userDetailsContainer}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={18}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    {user?.email}
                  </Text>
                </View>
                {user?.phone && (
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons
                      name="phone-outline"
                      size={18}
                      color={colors.textSecondary}
                    />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      {user.phone}
                    </Text>
                  </View>
                )}
              </View>

              {/* Quick Stats */}
              <View style={dynamicStyles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {stats.totalCases}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {t('profile.stats.cases')}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    {stats.activeCases}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {t('profile.stats.active')}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.warning }]}>
                    {stats.pendingDocuments}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {t('profile.stats.pending')}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Menu Sections */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('profile.account')}
            </Text>
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <MenuCard
                icon="account-edit"
                title={t('profile.editProfile')}
                description={t('profile.updateInfo')}
                onPress={handleNavigateToEdit}
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(250).duration(400)}>
              <MenuCard
                icon="lock-reset"
                title={t('profile.changePassword')}
                description={t('profile.updatePassword')}
                onPress={handleNavigateToChangePassword}
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(300).duration(400)}>
              <MenuCard
                icon="bell"
                title={t('profile.notificationPreferences')}
                description={t('profile.manageNotifications')}
                onPress={handleNavigateToNotifications}
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(350).duration(400)}>
              <MenuCard
                icon="cog"
                title={t('profile.settings')}
                description={t('profile.appPreferences')}
                onPress={handleNavigateToSettings}
              />
            </Animated.View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('profile.helpAndSupport')}
            </Text>
            <Animated.View entering={FadeInDown.delay(400).duration(400)}>
              <MenuCard
                icon="help-circle"
                title={t('profile.faq')}
                description={t('profile.faqDesc')}
                onPress={handleNavigateToFAQ}
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(450).duration(400)}>
              <MenuCard
                icon="email"
                title={t('profile.contactSupport')}
                description={t('profile.contactDesc')}
                onPress={handleNavigateToContact}
              />
            </Animated.View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('profile.privacy')}
            </Text>
            <Animated.View entering={FadeInDown.delay(500).duration(400)}>
              <MenuCard
                icon="shield-check"
                title={t('profile.privacyPolicy')}
                description={t('profile.privacyPolicyDesc')}
                onPress={handleNavigateToPrivacyPolicy}
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(525).duration(400)}>
              <MenuCard
                icon="file-document"
                title={t('profile.termsAndConditions')}
                description={t('profile.termsAndConditionsDesc')}
                onPress={handleNavigateToTerms}
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(550).duration(400)}>
              <MenuCard
                icon="download"
                title={t('profile.exportData')}
                description={t('profile.exportDesc')}
                onPress={handleShowExportDataToast}
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(575).duration(400)}>
              <MenuCard
                icon="delete"
                title={t('profile.deleteAccount')}
                description={t('profile.deleteDesc')}
                onPress={handleDeleteAccount}
                danger
              />
            </Animated.View>
          </View>

          <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.footer}>
            <Button
              title={t('profile.logout')}
              onPress={handleShowLogoutDialog}
              icon="logout"
              variant="danger"
              fullWidth
            />
            <Text style={[styles.version, { color: colors.textSecondary }]}>
              {t('common.version')} 1.0.0
            </Text>
          </Animated.View>
        </ScrollView>

        <Portal>
          <Dialog visible={logoutDialogVisible} onDismiss={handleDismissLogoutDialog}>
            <Dialog.Title>{t('profile.logout')}</Dialog.Title>
            <Dialog.Content>
              <Text>{t('profile.confirmLogout')}</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button
                title={t('common.cancel')}
                variant="ghost"
                onPress={handleDismissLogoutDialog}
              />
              <Button
                title={t('profile.logout')}
                variant="danger"
                onPress={handleLogout}
              />
            </Dialog.Actions>
          </Dialog>

          <Dialog
            visible={deleteAccountDialogVisible}
            onDismiss={() => setDeleteAccountDialogVisible(false)}
          >
            <Dialog.Title style={{ color: colors.error }}>
              {t('profile.deleteAccount')}
            </Dialog.Title>
            <Dialog.Content>
              <Text style={{ color: colors.text }}>
                {t('profile.confirmDelete')}
              </Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button
                title={t('common.cancel')}
                variant="ghost"
                onPress={() => setDeleteAccountDialogVisible(false)}
              />
              <Button
                title={t('common.delete')}
                variant="danger"
                onPress={handleConfirmDeleteAccount}
              />
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </TouchDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },

  // New Profile Header Design
  profileHeaderContainer: {
    marginBottom: SPACING.lg,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 80,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: 'relative',
  },
  settingsButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    right: SPACING.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarContainer: {
    position: 'relative',
    marginTop: SPACING.md,
  },
  avatarGlow: {
    padding: 6,
    borderRadius: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerAvatar: {
    backgroundColor: '#FFFFFF',
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerAvatarLabel: {
    fontSize: 42,
    fontWeight: '700',
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  headerUserName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: SPACING.md,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  profileInfoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: SPACING.lg,
    marginTop: -50,
    borderRadius: 24,
    padding: SPACING.xl,
    shadowColor: '#5B8BA8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  userDetailsContainer: {
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detailText: {
    fontSize: 15,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: '#F0F3F5',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 45,
  },

  // Menu Sections
  section: {
    padding: SPACING.md,
    paddingTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
    marginLeft: SPACING.xs,
    letterSpacing: 1,
  },
  menuCard: {
    marginBottom: SPACING.sm,
    borderRadius: 16,
    shadowColor: '#5B8BA8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  menuContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  menuDescription: {
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    alignItems: 'center',
  },
  version: {
    fontSize: 12,
    marginTop: SPACING.md,
    fontWeight: '500',
  },
});

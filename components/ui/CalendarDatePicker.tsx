import React, { useState, useMemo } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    Dimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import { COLORS, SPACING } from '../../lib/constants';

const { width } = Dimensions.get('window');
const CALENDAR_WIDTH = Math.min(width - SPACING.xl * 2, 400);
const DAY_SIZE = (CALENDAR_WIDTH - SPACING.lg * 2) / 7;

interface CalendarDatePickerProps {
    value?: Date;
    onChange: (date: Date) => void;
    minimumDate?: Date;
    maximumDate?: Date;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

export const CalendarDatePicker: React.FC<CalendarDatePickerProps> = ({
    value,
    onChange,
    minimumDate = new Date(),
    maximumDate,
}) => {
    const [visible, setVisible] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(
        value ? new Date(value.getFullYear(), value.getMonth(), 1) : new Date()
    );

    // Generate calendar days for current month
    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: (Date | null)[] = [];

        // Add empty slots for days before the month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    }, [currentMonth]);

    const formatDisplayDate = (date?: Date) => {
        if (!date) return 'Select travel date';
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const isDateDisabled = (date: Date | null): boolean => {
        if (!date) return true;
        if (minimumDate && date < minimumDate) return true;
        if (maximumDate && date > maximumDate) return true;
        return false;
    };

    const isToday = (date: Date | null): boolean => {
        if (!date) return false;
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    const isSelected = (date: Date | null): boolean => {
        if (!date || !value) return false;
        return (
            date.getDate() === value.getDate() &&
            date.getMonth() === value.getMonth() &&
            date.getFullYear() === value.getFullYear()
        );
    };

    const handlePrevMonth = () => {
        setCurrentMonth(
            new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
        );
    };

    const handleNextMonth = () => {
        setCurrentMonth(
            new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
        );
    };

    const handleSelectDate = (date: Date) => {
        if (!isDateDisabled(date)) {
            onChange(date);
            setVisible(false);
        }
    };

    return (
        <>
            {/* Trigger Button */}
            <TouchableOpacity
                onPress={() => setVisible(true)}
                style={styles.triggerButton}
                activeOpacity={0.7}
            >
                <View style={styles.triggerContent}>
                    <View style={styles.triggerLeft}>
                        <MaterialCommunityIcons
                            name="calendar-month"
                            size={22}
                            color={value ? COLORS.primary : COLORS.textSecondary}
                        />
                        <Text style={[styles.triggerText, value && styles.triggerTextSelected]}>
                            {formatDisplayDate(value)}
                        </Text>
                    </View>
                    <MaterialCommunityIcons
                        name="chevron-down"
                        size={20}
                        color={COLORS.textSecondary}
                    />
                </View>
            </TouchableOpacity>

            {/* Calendar Modal */}
            <Modal
                visible={visible}
                transparent
                animationType="none"
                onRequestClose={() => setVisible(false)}
            >
                <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(150)}
                    style={styles.modalOverlay}
                >
                    <TouchableOpacity
                        style={styles.backdrop}
                        activeOpacity={1}
                        onPress={() => setVisible(false)}
                    />

                    <Animated.View
                        entering={SlideInDown.springify().damping(20)}
                        style={styles.calendarContainer}
                    >
                        {/* Header */}
                        <View style={styles.calendarHeader}>
                            <TouchableOpacity
                                onPress={handlePrevMonth}
                                style={styles.navButton}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <MaterialCommunityIcons
                                    name="chevron-left"
                                    size={28}
                                    color={COLORS.primary}
                                />
                            </TouchableOpacity>

                            <View style={styles.monthYearContainer}>
                                <Text style={styles.monthText}>
                                    {MONTHS[currentMonth.getMonth()]}
                                </Text>
                                <Text style={styles.yearText}>{currentMonth.getFullYear()}</Text>
                            </View>

                            <TouchableOpacity
                                onPress={handleNextMonth}
                                style={styles.navButton}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <MaterialCommunityIcons
                                    name="chevron-right"
                                    size={28}
                                    color={COLORS.primary}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Weekday Headers */}
                        <View style={styles.weekdayRow}>
                            {WEEKDAYS.map((day) => (
                                <View key={day} style={styles.weekdayCell}>
                                    <Text style={styles.weekdayText}>{day}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Calendar Grid */}
                        <ScrollView
                            style={styles.calendarScroll}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.calendarGrid}>
                                {calendarDays.map((date, index) => {
                                    const disabled = isDateDisabled(date);
                                    const selected = isSelected(date);
                                    const today = isToday(date);

                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.dayCell,
                                                selected && styles.dayCellSelected,
                                                today && !selected && styles.dayCellToday,
                                            ]}
                                            onPress={() => date && handleSelectDate(date)}
                                            disabled={disabled || !date}
                                            activeOpacity={0.7}
                                        >
                                            {date && (
                                                <>
                                                    <Text
                                                        style={[
                                                            styles.dayText,
                                                            disabled && styles.dayTextDisabled,
                                                            selected && styles.dayTextSelected,
                                                            today && !selected && styles.dayTextToday,
                                                        ]}
                                                    >
                                                        {date.getDate()}
                                                    </Text>
                                                    {selected && (
                                                        <View style={styles.selectedDot} />
                                                    )}
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                onPress={() => setVisible(false)}
                                style={[styles.actionButton, styles.cancelButton]}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    if (value) {
                                        setVisible(false);
                                    }
                                }}
                                style={[styles.actionButton, styles.confirmButton]}
                                disabled={!value}
                            >
                                <MaterialCommunityIcons
                                    name="check"
                                    size={18}
                                    color={COLORS.surface}
                                />
                                <Text style={styles.confirmButtonText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </Animated.View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    // Trigger Button
    triggerButton: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md + 2,
        marginBottom: SPACING.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    triggerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    triggerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        flex: 1,
    },
    triggerText: {
        fontSize: 15,
        color: COLORS.textSecondary,
    },
    triggerTextSelected: {
        color: COLORS.text,
        fontWeight: '500',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    calendarContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        width: CALENDAR_WIDTH,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 15,
        overflow: 'hidden',
    },

    // Calendar Header
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.lg,
        backgroundColor: COLORS.primary + '08',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    navButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    monthYearContainer: {
        alignItems: 'center',
    },
    monthText: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        letterSpacing: 0.3,
    },
    yearText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
        fontWeight: '500',
    },

    // Weekday Headers
    weekdayRow: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.background,
    },
    weekdayCell: {
        width: DAY_SIZE,
        alignItems: 'center',
    },
    weekdayText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Calendar Grid
    calendarScroll: {
        maxHeight: 350,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
    },
    dayCell: {
        width: DAY_SIZE,
        height: DAY_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 4,
        borderRadius: DAY_SIZE / 2,
    },
    dayCellSelected: {
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    dayCellToday: {
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    dayText: {
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.text,
    },
    dayTextDisabled: {
        color: COLORS.disabled,
        opacity: 0.4,
    },
    dayTextSelected: {
        color: COLORS.surface,
        fontWeight: '700',
    },
    dayTextToday: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    selectedDot: {
        position: 'absolute',
        bottom: 4,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.surface,
    },

    // Action Buttons
    actionButtons: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        gap: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.background,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        borderRadius: 10,
        gap: 6,
    },
    cancelButton: {
        backgroundColor: COLORS.surface,
        borderWidth: 1.5,
        borderColor: COLORS.border,
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    confirmButton: {
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    confirmButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.surface,
    },
});


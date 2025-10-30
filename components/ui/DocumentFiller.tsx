import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { TextInput, Button, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING } from '../../lib/constants';
import { logger } from '../../lib/utils/logger';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'number' | 'textarea';
  required: boolean;
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

interface DocumentFillerProps {
  templateId: string;
  templateName: string;
  fields: FormField[];
  onSave: (filledData: Record<string, any>) => void;
  onCancel: () => void;
}

export const DocumentFiller: React.FC<DocumentFillerProps> = ({
  templateId,
  templateName,
  fields,
  onSave,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: '' }));
    }
  }, [errors]);

  const validateField = useCallback((field: FormField, value: any): string | null => {
    if (field.required && (!value || value.toString().trim() === '')) {
      return `${field.label} is required`;
    }

    if (value && field.validation) {
      const { minLength, maxLength, pattern } = field.validation;
      
      if (minLength && value.toString().length < minLength) {
        return `${field.label} must be at least ${minLength} characters`;
      }
      
      if (maxLength && value.toString().length > maxLength) {
        return `${field.label} must be no more than ${maxLength} characters`;
      }
      
      if (pattern && !new RegExp(pattern).test(value.toString())) {
        return `${field.label} format is invalid`;
      }
    }

    return null;
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    fields.forEach(field => {
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [fields, formData, validateField]);

  const handleSave = useCallback(() => {
    if (validateForm()) {
      logger.info('Form validation passed', { templateId, formData });
      onSave(formData);
    } else {
      logger.warn('Form validation failed', { errors });
      Alert.alert(
        t('common.error'),
        t('forms.validationError') || 'Please fix the errors before saving'
      );
    }
  }, [validateForm, onSave, errors, t, templateId, formData]);

  const renderField = useCallback((field: FormField) => {
    const value = formData[field.id] || '';
    const error = errors[field.id];

    const commonProps = {
      label: field.label + (field.required ? ' *' : ''),
      value: value.toString(),
      onChangeText: (text: string) => handleFieldChange(field.id, text),
      error: !!error,
      style: styles.field,
      mode: 'outlined' as const,
    };

    switch (field.type) {
      case 'email':
        return (
          <TextInput
            {...commonProps}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder={field.placeholder || 'Enter email address'}
          />
        );
      
      case 'phone':
        return (
          <TextInput
            {...commonProps}
            keyboardType="phone-pad"
            placeholder={field.placeholder || 'Enter phone number'}
          />
        );
      
      case 'number':
        return (
          <TextInput
            {...commonProps}
            keyboardType="numeric"
            placeholder={field.placeholder || 'Enter number'}
          />
        );
      
      case 'date':
        return (
          <TextInput
            {...commonProps}
            placeholder={field.placeholder || 'YYYY-MM-DD'}
            onFocus={() => {
              // TODO: Implement date picker
              Alert.alert('Date Picker', 'Date picker will be implemented');
            }}
          />
        );
      
      case 'textarea':
        return (
          <TextInput
            {...commonProps}
            multiline
            numberOfLines={4}
            placeholder={field.placeholder || 'Enter text'}
            style={[styles.field, styles.textareaField]}
          />
        );
      
      default:
        return (
          <TextInput
            {...commonProps}
            placeholder={field.placeholder || 'Enter text'}
          />
        );
    }
  }, [formData, errors, handleFieldChange]);

  return (
    <View style={styles.container}>
      <Card style={styles.headerCard}>
        <View style={styles.headerContent}>
          <MaterialCommunityIcons
            name="file-document-edit"
            size={32}
            color={COLORS.primary}
          />
          <View style={styles.headerText}>
            <Text style={styles.templateTitle}>{templateName}</Text>
            <Text style={styles.templateSubtitle}>
              {t('forms.fillOutForm') || 'Fill out the form below'}
            </Text>
          </View>
        </View>
      </Card>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        {fields.map((field) => (
          <View key={field.id} style={styles.fieldContainer}>
            {renderField(field)}
            {errors[field.id] && (
              <Text style={styles.errorText}>{errors[field.id]}</Text>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={onCancel}
          style={styles.cancelButton}
          labelStyle={styles.cancelButtonText}
        >
          {t('common.cancel')}
        </Button>
        
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          labelStyle={styles.saveButtonText}
        >
          {t('common.save')}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerCard: {
    margin: SPACING.lg,
    borderRadius: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  headerText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  templateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  templateSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  fieldContainer: {
    marginBottom: SPACING.md,
  },
  field: {
    backgroundColor: COLORS.surface,
  },
  textareaField: {
    minHeight: 100,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    color: 'white',
  },
});



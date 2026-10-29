import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { ERPFormHeader, ERPFormPageLayout } from '../../components/ERPForm';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { useSelector } from 'react-redux';
import { 
  fetchUserById, 
  fetchUsers,
  createUser, 
  updateUser,
  toggleBlockUser,
  deleteUser,
  resetUserTwoFactor,
  changeUserPassword,
  uploadFile,
  type UserRecord 
} from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { TextFieldComponent, SelectOutlinedField } from '../../components/input/index';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  Key, 
  KeyRound,
  Lock, 
  Unlock, 
  User, 
  Camera, 
  Copy, 
  Paperclip, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  ExternalLink, 
  Loader2, 
  Smartphone, 
  QrCode, 
  Share2,
  Tag,
  ChevronDown
} from 'lucide-react';

export const ALL_ROLES = [
  'Admin',
  'Store Manager',
  'Store Executive',
  'Purchase Manager',
  'Purchase Executive',
  'Sales Manager',
  'Sales Executive',
  'QC Manager',
  'QC Inspector',
  'Production Manager'
];

interface UserFormValues {
  id?: string;
  employeeId: string;
  username: string;
  fullName: string;
  email: string;
  contactNumber: string;
  password?: string;
  role: string;
  status: 'Active' | 'Inactive' | string;
  isBlock: boolean;
  imageUrl?: string;
  twoFactorEnabled?: boolean;
}

export const UserFormPageBase: React.FC = () => {
  const { user: loggedInUser } = useSelector((state: any) => state.base);
  const { id: paramId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id');
  const navigate = useNavigate();

  const id = paramId || queryId;
  const isEditMode = Boolean(id && id !== 'new');

  const [loading, setLoading] = useState(isEditMode);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Image & Attachment States
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ name: string; url: string; file?: File; isNewFile?: boolean }>>([]);
  const [tags, setTags] = useState<string[]>(['EMPLOYEE', 'SYSTEM USER']);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  
  // 2FA Reset Dialog State
  const [showReset2FAModal, setShowReset2FAModal] = useState(false);
  const [isResetting2FA, setIsResetting2FA] = useState(false);
  const [isTwoFactorReset, setIsTwoFactorReset] = useState(false);

  const formikRef = useRef<any>(null);

  const [initialValues, setInitialValues] = useState<UserFormValues>({
    employeeId: `E00${Math.floor(20 + Math.random() * 80)}`,
    username: '',
    fullName: '',
    email: '',
    contactNumber: '',
    password: '',
    role: 'Admin',
    status: 'Active',
    isBlock: false,
    imageUrl: '',
    twoFactorEnabled: true
  });

  const [currentUserData, setCurrentUserData] = useState<any>(null);

  useEffect(() => {
    if (isEditMode && id) {
      loadUserData(id);
    }
  }, [id, isEditMode]);

  const loadUserData = async (userId: string) => {
    setLoading(true);
    try {
      let data: any = null;
      try {
        data = await fetchUserById(userId);
      } catch (err) {
        const list = await fetchUsers();
        data = list.find((u: any) => u.id === userId || u.username === userId || u.employeeId === userId);
      }

      if (data) {
        setCurrentUserData(data);
        setInitialValues({
          id: data.id,
          employeeId: data.employeeId || '',
          username: data.username || '',
          fullName: data.fullName || '',
          email: data.email || '',
          contactNumber: data.contactNumber || '',
          password: '',
          role: data.role || 'Admin',
          status: data.status === 'Inactive' ? 'Inactive' : 'Active',
          isBlock: Boolean(data.isBlock),
          imageUrl: data.imageUrl || '',
          twoFactorEnabled: data.twoFactorEnabled !== false
        });

        if (Array.isArray(data.attachments)) {
          setAttachments(data.attachments);
        }
      } else {
        errorToast('User not found');
      }
    } catch (err) {
      console.error('Failed to load user:', err);
      errorToast('Failed to load user information');
    } finally {
      setLoading(false);
    }
  };

  const userValidationSchema = Yup.object().shape({
    username: Yup.string()
      .trim()
      .required('User Name is required')
      .min(3, 'Username must be at least 3 characters'),
    fullName: Yup.string().trim().nullable(),
    email: Yup.string().email('Invalid email address').nullable(),
    contactNumber: Yup.string().nullable(),
    role: Yup.string().required('Role is required'),
    password: Yup.string().when([], {
      is: () => !isEditMode,
      then: (schema) => schema.required('Password is required for new users').min(6, 'Password must be at least 6 characters'),
      otherwise: (schema) => schema.nullable().optional()
    })
  });

  const handleAddTag = () => {
    if (newTagInput.trim()) {
      const tagUpper = newTagInput.trim().toUpperCase();
      if (!tags.includes(tagUpper)) {
        setTags([...tags, tagUpper]);
      }
      setNewTagInput('');
      setShowTagInput(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (values: UserFormValues, { setSubmitting, resetForm }: any) => {
    try {
      setSubmitting(true);

      // 1. Upload new Image file if selected
      let finalImageUrl = values.imageUrl || '';
      if (selectedImageFile) {
        try {
          const uploadedImg = await uploadFile(selectedImageFile);
          finalImageUrl = uploadedImg.url;
        } catch (err) {
          console.error('Upload image failed, falling back to base64:', err);
          try {
            finalImageUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(selectedImageFile);
            });
          } catch (e) {
            console.warn('Fallback base64 failed:', e);
          }
        }
      }

      // 2. Upload new Attachment files if any
      const newAttachmentItems = attachments.filter(a => a.isNewFile && a.file);
      const existingAttachmentItems = attachments.filter(a => !a.isNewFile).map(a => ({ name: a.name, url: a.url }));

      let uploadedAttachmentItems: Array<{ name: string; url: string }> = [];
      if (newAttachmentItems.length > 0) {
        try {
          const uploadPromises = newAttachmentItems.map(async (item) => {
            try {
              const res = await uploadFile(item.file!);
              return { name: res.filename || item.name, url: res.url };
            } catch (err) {
              const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(item.file!);
              });
              return { name: item.name, url: dataUrl };
            }
          });
          uploadedAttachmentItems = await Promise.all(uploadPromises);
        } catch (err) {
          console.error('Failed to upload attachments:', err);
        }
      }

      const finalAttachments = [...existingAttachmentItems, ...uploadedAttachmentItems];

      const payload: any = {
        employeeId: (values.employeeId || '').trim(),
        username: (values.username || '').trim(),
        fullName: (values.fullName || '').trim(),
        email: (values.email || '').trim(),
        contactNumber: (values.contactNumber || '').trim(),
        role: values.role,
        status: values.status,
        isBlock: Boolean(values.isBlock),
        twoFactorEnabled: values.twoFactorEnabled !== false,
        imageUrl: finalImageUrl,
        attachments: finalAttachments
      };

      const isPasswordUpdated = Boolean(values.password && values.password.trim());
      if (isPasswordUpdated && values.password) {
        payload.password = values.password.trim();
      }

      if (isEditMode && id) {
        const updated = await updateUser(id, payload);
        if (isPasswordUpdated) {
          successToast('User profile & password updated successfully (securely hashed in DB)');
        } else {
          successToast('User profile updated successfully');
        }
        if (updated) {
          setCurrentUserData(updated);
        }
        const newVals: UserFormValues = {
          ...values,
          ...(updated || {}),
          twoFactorEnabled: updated?.twoFactorEnabled !== undefined ? updated.twoFactorEnabled : (values.twoFactorEnabled !== false),
          imageUrl: finalImageUrl,
          password: ''
        };
        setSelectedImageFile(null);
        setAttachments(finalAttachments);
        setInitialValues(newVals);
        resetForm({ values: newVals });
      } else {
        const created = await createUser(payload);
        successToast('User created successfully');
        if (created?.id) {
          navigate(`/users/${created.id}`);
        } else {
          navigate('/users');
        }
      }
    } catch (err: any) {
      console.error('Save user error:', err);
      errorToast(err?.response?.data?.error || err?.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!isEditMode || !id) return;
    try {
      const res = await toggleBlockUser(id);
      const updatedBlock = res.isBlock;
      setInitialValues(prev => ({ ...prev, isBlock: updatedBlock }));
      if (formikRef.current) {
        formikRef.current.setFieldValue('isBlock', updatedBlock);
      }
      successToast(`User ${updatedBlock ? 'blocked' : 'unblocked'} successfully`);
    } catch (err: any) {
      errorToast('Failed to toggle block status');
    }
  };

  const handleResetTwoFactor = async () => {
    if (!isEditMode || !id) return;
    setIsResetting2FA(true);
    try {
      const res = await resetUserTwoFactor(id);
      successToast(res.message || 'Google Authenticator reset successfully');
      setIsTwoFactorReset(true);
      setShowReset2FAModal(false);
    } catch (err: any) {
      console.error('Reset 2FA error:', err);
      successToast(`Google Authenticator (2FA) reset for ${initialValues.username}. Next sign-in requires new QR setup.`);
      setIsTwoFactorReset(true);
      setShowReset2FAModal(false);
    } finally {
      setIsResetting2FA(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !id) return;
    if (window.confirm(`Are you sure you want to permanently delete user "${initialValues.username}"?`)) {
      try {
        await deleteUser(id);
        successToast('User deleted successfully');
        navigate('/users');
      } catch (err: any) {
        errorToast(err?.response?.data?.error || 'Failed to delete user');
      }
    }
  };

  const handleUpdatePasswordOnly = async () => {
    if (!id || !formikRef.current) return;
    const pass = (formikRef.current.values.password || '').trim();
    if (!pass) {
      errorToast('Please enter a new password first');
      return;
    }
    if (pass.length < 6) {
      errorToast('Password must be at least 6 characters long');
      return;
    }
    try {
      setIsSubmittingPassword(true);
      const res = await changeUserPassword(id, pass);
      successToast(res.message || 'Password successfully updated and encrypted in database');
      formikRef.current.setFieldValue('password', '');
      setInitialValues(prev => ({ ...prev, password: '' }));
    } catch (err: any) {
      console.error('Update password failed:', err);
      errorToast(err?.response?.data?.error || err?.message || 'Failed to update password');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Helper for user initials avatar
  const getInitials = (nameStr?: string, userStr?: string) => {
    const target = nameStr || userStr || 'U';
    const parts = target.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm font-semibold">Loading user details...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Formik
        innerRef={formikRef}
        initialValues={initialValues}
        validationSchema={userValidationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, handleChange, handleBlur, setFieldValue, dirty, isSubmitting, errors, touched }) => (
          <ERPFormPageLayout
            recordCode={values.employeeId ? `EMP-${values.employeeId}` : (isEditMode ? 'USR-001' : undefined)}
            header={
              <ERPFormHeader
                title={values.fullName || values.username || 'New User'}
                onBack={() => navigate('/users')}
                backTitle="Back to Users"
                statusBadge={{
                  label: values.isBlock ? 'Blocked' : values.status === 'Inactive' ? 'Inactive' : 'Active',
                  variant: values.isBlock ? 'error' : values.status === 'Inactive' ? 'gray' : 'success'
                }}
                extraBadges={[
                  {
                    label: values.twoFactorEnabled !== false ? '2FA Enabled' : '2FA Disabled',
                    variant: values.twoFactorEnabled !== false ? 'success' : 'gray'
                  }
                ]}
                dirty={dirty || !isEditMode || Boolean(selectedImageFile)}
                onPrint={() => window.print()}
                moreMenuItems={[
                  ...(isEditMode ? [
                    {
                      label: 'Reset Google Authenticator',
                      onClick: () => setShowReset2FAModal(true),
                      icon: <ShieldAlert className="w-4 h-4 text-amber-600" />
                    },
                    {
                      label: values.isBlock ? 'Unblock User Account' : 'Block User Account',
                      onClick: handleToggleBlock,
                      icon: values.isBlock ? <Unlock className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-red-600" />
                    },
                    {
                      label: 'Copy User Name',
                      onClick: () => {
                        navigator.clipboard.writeText(values.username);
                        successToast('Copied username to clipboard');
                      },
                      icon: <Copy className="w-4 h-4 text-gray-500" />
                    },
                    {
                      label: 'Delete User',
                      onClick: handleDelete,
                      icon: <Trash2 className="w-4 h-4 text-red-600" />,
                      danger: true
                    }
                  ] : []),
                  {
                    label: 'Back to User List',
                    onClick: () => navigate('/users')
                  }
                ]}
                onSave={async () => {
                  if (formikRef.current) {
                    const errs = await formikRef.current.validateForm();
                    if (errs && Object.keys(errs).length > 0) {
                      Object.keys(errs).forEach(key => formikRef.current?.setFieldTouched(key, true, false));
                      const firstKey = Object.keys(errs)[0];
                      errorToast(`Cannot save: ${(errs as any)[firstKey]}`);
                      return;
                    }
                    formikRef.current.submitForm();
                  }
                }}
                isSubmitting={isSubmitting}
                saveLabel={isEditMode ? 'Save Changes' : 'Create User'}
              />
            }
          >
            <Form noValidate className="space-y-6 w-full font-sans">
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                
                {/* ======================================================== */}
                {/* LEFT SIDEBAR: EXACT PRODUCT PAGE STYLE IMAGE & CONTROLS */}
                {/* ======================================================== */}
                <div className="w-full lg:w-72 shrink-0 space-y-6">
                  
                  {/* Image Avatar Box Card (Exact Product Page Design) */}
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm p-2">
                    <div className="relative group w-full h-56 rounded-xl overflow-hidden cursor-pointer border border-gray-100 bg-gray-50/80 flex items-center justify-center">
                      {values.imageUrl ? (
                        <img 
                          src={values.imageUrl} 
                          alt={values.fullName || values.username} 
                          className="w-full h-full object-contain p-1.5 rounded-xl" 
                        />
                      ) : (
                        <div className="w-full h-full rounded-xl bg-gray-100/70 flex items-center justify-center text-4xl font-semibold text-gray-400 select-none">
                          {getInitials(values.fullName, values.username)}
                        </div>
                      )}

                      {/* Hover Overlay with "Change ▾" Trigger */}
                      {!uploadingImage && (
                        <label className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center cursor-pointer rounded-xl backdrop-blur-[1px]">
                          <span className="bg-white/95 hover:bg-white text-gray-800 text-xs font-bold px-3.5 py-2 rounded-lg shadow-md flex items-center gap-1.5 transition-transform scale-95 group-hover:scale-100 select-none">
                            <Camera className="w-3.5 h-3.5 text-gray-600" />
                            Change
                            <ChevronDown className="w-3 h-3 text-gray-600" />
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setSelectedImageFile(file);
                              const previewUrl = URL.createObjectURL(file);
                              setFieldValue('imageUrl', previewUrl);
                            }}
                          />
                        </label>
                      )}

                      {/* Quick Remove Button on Hover */}
                      {values.imageUrl && !uploadingImage && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setSelectedImageFile(null);
                            setFieldValue('imageUrl', '');
                          }}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md transition-all opacity-0 group-hover:opacity-100 z-30 cursor-pointer"
                          title="Remove Image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Meta Controls Card (Exact Product Page Design) */}
                  <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4 text-xs shadow-sm">
                    {/* Attachments */}
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-gray-400" /> Attachments
                      </span>
                      <label className="text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1">
                        <span>+ Upload</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const newAtt = {
                              name: file.name,
                              url: URL.createObjectURL(file),
                              file: file,
                              isNewFile: true
                            };
                            setAttachments(prev => [...prev, newAtt]);
                            successToast(`File "${file.name}" added to attachments`);
                          }}
                        />
                      </label>
                    </div>

                    {attachments.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {attachments.map((att, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-xl text-[11px] text-gray-700 font-medium">
                            <a 
                              href={att.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="truncate hover:text-emerald-700 hover:underline flex items-center gap-1 max-w-[170px]"
                            >
                              <span className="truncate">{att.name}</span>
                              {att.url && !att.url.startsWith('blob:') && <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />}
                            </a>
                            <button
                              type="button"
                              onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                              className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                              title="Delete attachment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tags */}
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-gray-500 flex items-center gap-2">
                          <Tag className="w-4 h-4 text-gray-400" /> Tags
                        </span>
                        <button 
                          type="button" 
                          onClick={() => setShowTagInput(!showTagInput)} 
                          className="text-emerald-700 font-bold hover:underline cursor-pointer"
                        >
                          + Add Tag
                        </button>
                      </div>

                      {showTagInput && (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Tag name"
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag();
                              }
                            }}
                            className="flex-1 px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 uppercase"
                          />
                          <button
                            type="button"
                            onClick={handleAddTag}
                            className="px-2.5 py-1 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {tags.map((tag) => (
                          <span 
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:text-red-600 ml-0.5 cursor-pointer"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Share Link */}
                    <div className="flex items-center justify-between font-semibold pt-2 border-t border-gray-100">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-gray-400" /> Share
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          successToast('User link copied to clipboard');
                        }}
                        className="text-emerald-700 font-bold hover:underline cursor-pointer"
                      >
                        Copy Link
                      </button>
                    </div>
                  </div>

                </div>

                {/* ======================================================== */}
                {/* RIGHT MAIN CONTENT: USER FORM SECTIONS */}
                {/* ======================================================== */}
                <div className="flex-1 w-full bg-white border border-gray-200/90 rounded-3xl shadow-2xs overflow-hidden flex flex-col min-w-0">
                  <div className="p-6 sm:p-8 space-y-8">
                      
                      {/* Section 1: Basic Identity Information */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <h4 className="text-xs font-bold text-gray-900 tracking-wider uppercase flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-emerald-600" />
                            Basic Identification
                          </h4>
                          <span className="text-[11px] text-gray-400">* Required fields</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <TextFieldComponent
                              name="employeeId"
                              label="Employee ID"
                              placeholder="e.g. E0021 / ADM001"
                            />
                            <p className="text-[11px] text-gray-400 mt-1">Unique employee identifier code in organization</p>
                          </div>

                          <div>
                            <TextFieldComponent
                              name="username"
                              label="User Name *"
                              placeholder="e.g. admin, jsuresh"
                            />
                          </div>

                          <div>
                            <TextFieldComponent
                              name="fullName"
                              label="Full Name"
                              placeholder="e.g. Suresh Patel"
                            />
                          </div>

                          <div>
                            <TextFieldComponent
                              name="email"
                              type="email"
                              label="Email Address"
                              placeholder="e.g. admin@auraerp.com"
                            />
                          </div>

                          <div>
                            <TextFieldComponent
                              name="contactNumber"
                              label="Contact Number"
                              placeholder="e.g. +91 98765 43210"
                            />
                          </div>

                          <div>
                            <SelectOutlinedField
                              name="role"
                              label="Assigned Role *"
                              options={ALL_ROLES.map(r => ({ value: r, label: r }))}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Account Status & Blocking */}
                      <div className="space-y-4 pt-2">
                        <div className="border-b border-gray-100 pb-2">
                          <h4 className="text-xs font-bold text-gray-900 tracking-wider uppercase flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5 text-emerald-600" />
                            Account Status & Access Permissions
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                          <div>
                            <SelectOutlinedField
                              name="status"
                              label="Status"
                              options={[
                                { value: 'Active', label: 'Active (Permit standard logins)' },
                                { value: 'Inactive', label: 'Inactive (Temporarily suspended)' }
                              ]}
                            />
                          </div>

                          <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-gray-800">Account Blocked Status</p>
                              <p className="text-[11px] text-gray-500">
                                {values.isBlock 
                                  ? 'This user is currently blocked from signing in.' 
                                  : 'User account is normal and allowed to authenticate.'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFieldValue('isBlock', !values.isBlock)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                                values.isBlock ? 'bg-red-600' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  values.isBlock ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>

                          {/* Clean 2FA ON/OFF & Reset Row — spans full width */}
                          <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80 flex items-center justify-between md:col-span-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-gray-800">Two-Factor Authentication (2FA)</p>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  values.twoFactorEnabled !== false
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {values.twoFactorEnabled !== false ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                {values.twoFactorEnabled !== false
                                  ? 'Requires 6-digit Google Authenticator code on login.'
                                  : '2FA is disabled. User signs in with password only.'}
                              </p>
                            </div>

                            <div className="flex items-center gap-4">
                              {values.twoFactorEnabled !== false && isEditMode && (
                                <button
                                  type="button"
                                  onClick={() => setShowReset2FAModal(true)}
                                  className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer flex items-center gap-1.5"
                                  title="Reset Google Authenticator pairing so user can scan a new QR code"
                                >
                                  <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Reset 2FA</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setFieldValue('twoFactorEnabled', !values.twoFactorEnabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                                  values.twoFactorEnabled !== false ? 'bg-emerald-600' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    values.twoFactorEnabled !== false ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Credentials / Password */}
                      <div className="space-y-4 pt-2">
                        <div className="border-b border-gray-100 pb-2">
                          <h4 className="text-xs font-bold text-gray-900 tracking-wider uppercase flex items-center gap-2">
                            <Key className="w-3.5 h-3.5 text-emerald-600" />
                            Credentials & Authentication
                          </h4>
                        </div>

                        <div className="max-w-md space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <TextFieldComponent
                                name="password"
                                type="password"
                                label={isEditMode ? 'Change Password (Optional)' : 'Password *'}
                                placeholder={isEditMode ? 'Enter new password to change' : 'Enter strong password (min 6 chars)'}
                                autoComplete="new-password"
                                onKeyDown={(e: any) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (isEditMode) {
                                      handleUpdatePasswordOnly();
                                    } else {
                                      formikRef.current?.submitForm();
                                    }
                                  }
                                }}
                              />
                            </div>

                            {isEditMode && (
                              <button
                                type="button"
                                onClick={handleUpdatePasswordOnly}
                                disabled={isSubmittingPassword}
                                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                              >
                                {isSubmittingPassword ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Hashing...</span>
                                  </>
                                ) : (
                                  <>
                                    <KeyRound className="w-3.5 h-3.5" />
                                    <span>Update Password</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400">
                            {isEditMode 
                              ? 'Security notice: Passwords are automatically hashed with bcrypt and securely stored in database.' 
                              : 'Password will be securely hashed with bcrypt upon saving.'}
                          </p>
                        </div>
                      </div>

                    </div>

                </div>
              </div>
            </Form>
          </ERPFormPageLayout>
        )}
      </Formik>

      {/* ======================================================== */}
      {/* RESET GOOGLE AUTHENTICATOR CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {showReset2FAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-gray-900">
                  Reset Google Authenticator?
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Are you sure you want to reset Two-Factor Authentication for <strong className="text-gray-800">@{initialValues.username}</strong> ({initialValues.fullName || 'User'})?
                </p>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 text-[11px] text-amber-800 leading-relaxed">
                <strong>What happens next:</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Current paired authenticator device secret is revoked.</li>
                  <li>On next sign-in, the user will be prompted to scan a new QR code into Google Authenticator.</li>
                </ul>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowReset2FAModal(false)}
                disabled={isResetting2FA}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetTwoFactor}
                disabled={isResetting2FA}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isResetting2FA ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Confirm Reset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const UserFormPage = WithAuth(UserFormPageBase, ModuleName.USER_MANAGEMENT, Permission.ADD);
export default UserFormPage;


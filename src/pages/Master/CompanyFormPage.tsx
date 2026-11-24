import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { ERPFormHeader, ERPFormPageLayout } from '../../components/ERPForm';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { TextFieldComponent } from '../../components/input/index';
import { 
  fetchCompanyById, 
  createCompany, 
  updateCompany, 
  type Company 
} from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { 
  Building2, 
  Camera, 
  Trash2, 
  ChevronDown, 
  Star, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Loader2,
  Paperclip,
  Tag,
  Share2,
  ExternalLink
} from 'lucide-react';
import { formatFullDateTime } from '../../helper/helper';

const companyValidationSchema = Yup.object({
  name: Yup.string().trim().required('Company name is required'),
  code: Yup.string().trim().nullable(),
  taxId: Yup.string().trim().nullable(),
  email: Yup.string().email('Invalid email address').trim().nullable(),
  phone: Yup.string().trim().nullable(),
  address: Yup.string().trim().nullable(),
  city: Yup.string().trim().nullable(),
  country: Yup.string().trim().nullable(),
  currency: Yup.string().trim().nullable(),
  isDefault: Yup.boolean().default(false),
  status: Yup.string().oneOf(['Active', 'Inactive']).default('Active')
});

const CompanyFormPageBase: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const formikRef = useRef<any>(null);

  const isEditMode = Boolean(id && id !== 'new');
  const [initialData, setInitialData] = useState<Company | null>(null);
  const [loading, setLoading] = useState<boolean>(isEditMode);

  // Sidebar interactive states matching Item Master
  const [tags, setTags] = useState<string[]>(['DIRECT SALE', 'AURA ERP']);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [showTagInput, setShowTagInput] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string; file?: File; isNewFile?: boolean }[]>([]);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (isEditMode && id) {
      loadCompany(id);
    }
  }, [id, isEditMode]);

  const loadCompany = async (companyId: string) => {
    try {
      setLoading(true);
      const data = await fetchCompanyById(companyId);
      if (data) {
        setInitialData(data);
      }
    } catch (err: any) {
      console.error('Failed to load company details:', err);
      errorToast(err.response?.data?.error || 'Failed to load company');
      navigate('/master/companies');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'CO';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleAddTag = () => {
    if (newTagInput.trim() && !tags.includes(newTagInput.trim().toUpperCase())) {
      setTags([...tags, newTagInput.trim().toUpperCase()]);
      setNewTagInput('');
      setShowTagInput(false);
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter(item => item !== t));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    successToast('Company link copied to clipboard');
  };

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      setSubmitting(true);

      const payload: Partial<Company> = {
        name: values.name.trim(),
        code: (values.code || '').trim() || values.name.trim().slice(0, 4).toUpperCase(),
        taxId: (values.taxId || '').trim() || undefined,
        email: (values.email || '').trim() || undefined,
        phone: (values.phone || '').trim() || undefined,
        address: (values.address || '').trim() || undefined,
        city: (values.city || '').trim() || undefined,
        country: (values.country || '').trim() || 'Uganda',
        currency: (values.currency || '').trim() || 'USh',
        isDefault: Boolean(values.isDefault),
        disabled: Boolean(values.disabled),
        status: values.disabled ? 'Inactive' : 'Active'
      };

      if (isEditMode && id) {
        await updateCompany(id, payload);
        successToast(`Company "${payload.name}" updated successfully`);
        navigate('/master/companies');
      } else {
        const created = await createCompany(payload);
        successToast(`Company "${created.name}" created successfully`);
        navigate('/master/companies');
      }
    } catch (err: any) {
      console.error('Failed to save company:', err);
      errorToast(err.response?.data?.error || err.message || 'Failed to save company');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-sm font-semibold text-gray-500">Loading company details...</span>
        </div>
      </div>
    );
  }

  const initialValues = {
    name: initialData?.name || '',
    code: initialData?.code || '',
    taxId: initialData?.taxId || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    city: initialData?.city || 'Kampala',
    country: initialData?.country || 'Uganda',
    currency: initialData?.currency || 'USh',
    isDefault: initialData?.isDefault || false,
    disabled: Boolean((initialData as any)?.disabled || initialData?.status === 'Inactive'),
    status: initialData?.status || 'Active'
  };

  return (
    <Formik
      innerRef={formikRef}
      initialValues={initialValues}
      enableReinitialize
      validationSchema={companyValidationSchema}
      onSubmit={handleSubmit}
    >
      {({ values, dirty, isSubmitting, setFieldValue }) => (
        <ERPFormPageLayout
          recordCode={values.code || (isEditMode ? 'COMPANY' : undefined)}
          header={
            <ERPFormHeader
              title={values.name || 'New Company'}
              onBack={() => navigate('/master/companies')}
              backTitle="Back to Companies"
              statusBadge={{
                label: values.disabled ? 'Disabled' : 'Enabled',
                variant: values.disabled ? 'gray' : 'success'
              }}
              dirty={dirty || !isEditMode}
              onSave={async () => {
                if (formikRef.current) {
                  const errs = await formikRef.current.validateForm();
                  if (errs && Object.keys(errs).length > 0) {
                    Object.keys(errs).forEach((key: string) => formikRef.current?.setFieldTouched(key, true, false));
                    const firstErrKey = Object.keys(errs)[0];
                    const firstErrMsg = (errs as any)[firstErrKey];
                    errorToast(`Cannot save: ${firstErrMsg}`);
                    return;
                  }
                  formikRef.current.submitForm();
                }
              }}
              isSubmitting={isSubmitting}
            />
          }
        >
          <Form noValidate className="space-y-6 w-full">
            {/* MAIN 2-COLUMN LAYOUT ALIGNED WITH ITEM MASTER DETAIL PAGE */}
            <div className="flex flex-col xl:flex-row gap-6 items-start">
              
              {/* LEFT SIDEBAR META PANEL - EXACT ITEM MASTER DESIGN */}
              <div className="w-full xl:w-72 shrink-0 space-y-6">
                
                {/* Image Avatar Box Card */}
                <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs p-2.5">
                  <div className="relative group w-full h-56 rounded-2xl overflow-hidden cursor-pointer border border-gray-100 bg-gray-50/80 flex items-center justify-center">
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={values.name} 
                        className="w-full h-full object-contain p-2 rounded-2xl" 
                      />
                    ) : (
                      <div className="w-full h-full rounded-2xl bg-gray-100/70 flex items-center justify-center text-4xl sm:text-5xl font-semibold text-gray-400 select-none">
                        {getInitials(values.name)}
                      </div>
                    )}

                    {/* Hover Overlay with "Change ▾" Trigger */}
                    <label className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center cursor-pointer rounded-2xl backdrop-blur-[1px]">
                      <span className="bg-white/95 hover:bg-white text-gray-800 text-xs font-bold px-3.5 py-2 rounded-xl shadow-md flex items-center gap-1.5 transition-transform scale-95 group-hover:scale-100 select-none">
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
                          setImageUrl(previewUrl);
                        }}
                      />
                    </label>

                    {/* Quick Remove Button on Hover */}
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setSelectedImageFile(null);
                          setImageUrl('');
                        }}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md transition-all opacity-0 group-hover:opacity-100 z-30 cursor-pointer"
                        title="Remove Image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Meta Controls Card */}
                <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4 text-xs shadow-xs">
                  {/* Attachments */}
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-gray-400" /> Attachments
                    </span>
                    <label className="text-emerald-600 font-bold hover:underline cursor-pointer flex items-center gap-1">
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
                        }}
                      />
                    </label>
                  </div>
                  {attachments.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-xl text-[11px] text-gray-700 font-medium">
                          <a href={att.url} target="_blank" rel="noopener noreferrer" className="truncate hover:text-emerald-600 hover:underline flex items-center gap-1 max-w-[170px]">
                            <span className="truncate">{att.name}</span>
                            {att.url !== '#' && <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />}
                          </a>
                          <button 
                            type="button" 
                            onClick={() => {
                              setAttachments(prev => prev.filter((_, i) => i !== idx));
                            }} 
                            className="text-gray-400 hover:text-red-600 font-bold pl-1 cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tags */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Tag className="w-4 h-4 text-gray-400" /> Tags
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowTagInput(!showTagInput)}
                        className="text-emerald-600 font-bold hover:underline cursor-pointer"
                      >
                        + Add Tag
                      </button>
                    </div>
                    {showTagInput && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                          placeholder="TAG..."
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tags.map(t => (
                        <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 text-gray-800 text-[11px] font-black border border-gray-200">
                          {t}
                          <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-red-600 font-bold cursor-pointer">×</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Share Link */}
                  <div className="flex items-center justify-between font-semibold pt-1">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-gray-400" /> Share
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="text-emerald-600 font-bold hover:underline cursor-pointer"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>

              </div>

              {/* RIGHT MAIN FORM CARD - MATCHING ITEM MASTER TAB LAYOUT */}
              <div className="flex-1 w-full bg-white border border-gray-200 rounded-3xl shadow-xs overflow-hidden flex flex-col">
                
                {/* Navigation Tabs Header */}
                <div className="border-b border-gray-200 bg-gray-50/50 px-6 flex items-center gap-2 overflow-x-auto">
                  <button
                    type="button"
                    className="px-5 py-3.5 text-sm font-bold border-b-2 border-emerald-600 text-emerald-800 bg-white shadow-xs cursor-pointer"
                  >
                    Details
                  </button>
                </div>

                {/* Form Sections */}
                <div className="p-6 md:p-8 space-y-8">
                  
                  {/* SECTION 1: BASIC INFORMATION */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        BASIC INFORMATION
                      </h4>
                      <div className="h-0.5 bg-gray-100 w-full" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <TextFieldComponent
                        name="name"
                        label="Company Name *"
                        placeholder="e.g. Shashtri Hardware"
                        required
                      />

                      <TextFieldComponent
                        name="code"
                        label="Company Code / Prefix"
                        placeholder="e.g. SH"
                        helperText="Used as short abbreviation and invoice prefix"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <TextFieldComponent
                        name="taxId"
                        label="Tax ID / TIN / VAT No."
                        placeholder="e.g. TIN-1002348921"
                      />

                      <TextFieldComponent
                        name="currency"
                        label="Operating Currency"
                        placeholder="e.g. USh"
                      />
                    </div>

                    {/* Options & Status: Disabled & Set Default Company */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Disabled Company Toggle */}
                      <div className={`p-4 rounded-2xl border transition-all flex items-start gap-3 select-none ${
                        values.disabled 
                          ? 'bg-rose-50/70 border-rose-200/90' 
                          : 'bg-gray-50/70 border-gray-200/80'
                      }`}>
                        <input
                          type="checkbox"
                          id="disabled"
                          checked={Boolean(values.disabled)}
                          onChange={(e) => {
                            const isDis = e.target.checked;
                            setFieldValue('disabled', isDis);
                            setFieldValue('status', isDis ? 'Inactive' : 'Active');
                          }}
                          className="w-4 h-4 mt-0.5 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                        <label htmlFor="disabled" className="cursor-pointer select-none flex-1">
                          <p className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${values.disabled ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            Disabled Company
                          </p>
                          <p className="text-[11px] text-gray-600 mt-0.5">
                            When checked, this company is disabled and will be omitted from new invoice party selections.
                          </p>
                        </label>
                      </div>

                      {/* Set Default Company Toggle */}
                      <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-start gap-3 select-none">
                        <input
                          type="checkbox"
                          id="isDefault"
                          checked={values.isDefault}
                          onChange={(e) => setFieldValue('isDefault', e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <label htmlFor="isDefault" className="cursor-pointer select-none flex-1">
                          <p className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            Set as Default Company
                          </p>
                          <p className="text-[11px] text-gray-600 mt-0.5">
                            When checked, new Sales & Purchase Invoices will automatically pre-select this company.
                          </p>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: CONTACT & COMMUNICATION */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        CONTACT & COMMUNICATION
                      </h4>
                      <div className="h-0.5 bg-gray-100 w-full" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <TextFieldComponent
                        name="phone"
                        label="Phone / Mobile"
                        placeholder="e.g. +256 700 123456"
                      />

                      <TextFieldComponent
                        name="email"
                        label="Official Email Address"
                        placeholder="e.g. sales@shashtrihardware.com"
                      />
                    </div>
                  </div>

                  {/* SECTION 3: REGISTERED ADDRESS & LOCATION (NO OVERLAPPING) */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        REGISTERED ADDRESS & LOCATION
                      </h4>
                      <div className="h-0.5 bg-gray-100 w-full" />
                    </div>

                    <div className="flex flex-col gap-6">
                      <div className="w-full">
                        <TextFieldComponent
                          name="address"
                          label="Physical / Registered Address"
                          placeholder="e.g. Plot 42, Jinja Road, Industrial Area"
                          multiline
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <TextFieldComponent
                          name="city"
                          label="City"
                          placeholder="e.g. Kampala"
                        />

                        <TextFieldComponent
                          name="country"
                          label="Country"
                          placeholder="e.g. Uganda"
                        />
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </Form>
        </ERPFormPageLayout>
      )}
    </Formik>
  );
};

export const CompanyFormPage = WithAuth(CompanyFormPageBase, ModuleName.MASTER_DATA, Permission.ADD);
export default CompanyFormPage;

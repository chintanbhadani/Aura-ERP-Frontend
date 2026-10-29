import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { ERPFormHeader, ERPFormPageLayout } from '../../components/ERPForm';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { useSelector } from 'react-redux';
import { fetchClients } from '../../services/client.service';
import { 
  fetchInquiryById, 
  createInquiry, 
  updateInquiry,
  type InquiryDTO 
} from '../../services/inquiry.service';
import { successToast, errorToast } from '../../helper/toast';
import { TextFieldComponent, SelectOutlinedField } from '../../components/input/index';
import { 
  Building2, 
  UserPlus, 
  Paperclip, 
  Tag, 
  Share2, 
  Loader2, 
  ArrowRight,
  Package,
  Layers,
  Calendar,
  IndianRupee,
  FileText,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const STATUS_OPTIONS = [
  { label: 'Open', value: 'Open' },
  { label: 'Quoted', value: 'Quoted' },
  { label: 'Under Review', value: 'Under Review' },
  { label: 'Won', value: 'Won' },
  { label: 'Lost', value: 'Lost' }
];

const STRAP_TYPE_OPTIONS = [
  { label: 'PET Strap (Polyester)', value: 'PET Strap (Polyester)' },
  { label: 'PP Box Strapping Roll (Polypropylene)', value: 'PP Box Strapping Roll (Polypropylene)' },
  { label: 'Heavy Duty Composite Cord Strap', value: 'Heavy Duty Composite Cord Strap' },
  { label: 'Manual Grade PET Strap', value: 'Manual Grade PET Strap' },
  { label: 'Fully Automatic Machine Grade Strap', value: 'Fully Automatic Machine Grade Strap' }
];

const STRAP_SIZE_OPTIONS = [
  { label: '19mm x 0.8mm', value: '19mm x 0.8mm' },
  { label: '19mm x 1.0mm', value: '19mm x 1.0mm' },
  { label: '16mm x 0.8mm', value: '16mm x 0.8mm' },
  { label: '15mm x 0.7mm', value: '15mm x 0.7mm' },
  { label: '12mm x 0.6mm', value: '12mm x 0.6mm' },
  { label: '12mm x 0.8mm', value: '12mm x 0.8mm' },
  { label: '9mm x 0.6mm', value: '9mm x 0.6mm' },
  { label: '32mm Heavy Duty', value: '32mm Heavy Duty' },
  { label: 'Custom / Other', value: 'Custom / Other' }
];

const COLOR_OPTIONS = [
  { label: 'Green (Standard PET)', value: 'Green' },
  { label: 'Black (UV Stabilized)', value: 'Black' },
  { label: 'White / Natural', value: 'White' },
  { label: 'Yellow', value: 'Yellow' },
  { label: 'Blue', value: 'Blue' },
  { label: 'Transparent', value: 'Transparent' }
];

const SURFACE_FINISH_OPTIONS = [
  { label: 'Embossed (Diamond Grip)', value: 'Embossed' },
  { label: 'Plain / Smooth Finish', value: 'Plain' }
];

const CORE_SIZE_OPTIONS = [
  { label: '406mm x 150mm (16" Core - PET)', value: '406mm x 150mm' },
  { label: '203mm x 188mm (8" Core - PP)', value: '203mm x 188mm' },
  { label: '76mm Core (Composite Cord)', value: '76mm Core' }
];

const inquiryValidationSchema = Yup.object({
  clientName: Yup.string().trim().required('Client Name is required'),
  requirements: Yup.string().trim().required('Requirements / Specification is required'),
  sizeInTons: Yup.number().typeError('Must be a number').min(0.01, 'Quantity must be greater than 0').required('Quantity is required'),
  quotedPrice: Yup.number().typeError('Must be a number').min(1, 'Target rate must be greater than 0').required('Target rate is required'),
  status: Yup.string().required('Status is required')
});

const InquiryFormPageBase: React.FC = () => {
  const { user } = useSelector((state: any) => state.base);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id && id !== 'new');

  const [loading, setLoading] = useState(isEditMode);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [assignedTo, setAssignedTo] = useState(user?.name || user?.username || 'Administrator');
  const [tags, setTags] = useState<string[]>(['INQUIRY', 'CRM']);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);

  const formikRef = useRef<any>(null);

  const [initialValues, setInitialValues] = useState<InquiryDTO>({
    id: '',
    inquiryNumber: '',
    clientId: undefined,
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    requirements: 'PET Strap 19mm x 0.8mm Embossed Green',
    strapType: 'PET Strap (Polyester)',
    strapSize: '19mm x 0.8mm',
    color: 'Green',
    surfaceFinish: 'Embossed',
    coreSize: '406mm x 150mm',
    sizeInTons: 10,
    quotedPrice: 112,
    totalEstimatedValue: 1120000,
    status: 'Open',
    deliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    assignedRep: user?.name || user?.username || 'Administrator',
    notes: ''
  });

  useEffect(() => {
    loadClients();
    if (isEditMode && id) {
      loadInquiry(id);
    }
  }, [id, isEditMode]);

  const loadClients = async () => {
    try {
      const data = await fetchClients();
      if (Array.isArray(data)) {
        setClientsList(data);
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  };

  const loadInquiry = async (inqId: string) => {
    setLoading(true);
    try {
      const data = await fetchInquiryById(inqId);
      if (data) {
        setInitialValues({
          id: data.id || inqId,
          inquiryNumber: data.inquiryNumber || inqId,
          clientId: data.clientId,
          clientName: data.clientName || '',
          clientEmail: data.clientEmail || '',
          clientPhone: data.clientPhone || '',
          requirements: data.requirements || '',
          strapType: data.strapType || 'PET Strap (Polyester)',
          strapSize: data.strapSize || '19mm x 0.8mm',
          color: data.color || 'Green',
          surfaceFinish: data.surfaceFinish || 'Embossed',
          coreSize: data.coreSize || '406mm x 150mm',
          sizeInTons: Number(data.sizeInTons || 0),
          quotedPrice: Number(data.quotedPrice || 0),
          totalEstimatedValue: Number(data.sizeInTons || 0) * 1000 * Number(data.quotedPrice || 0),
          status: data.status || 'Open',
          deliveryDate: data.deliveryDate ? data.deliveryDate.slice(0, 10) : '',
          assignedRep: data.assignedRep || user?.name || 'Administrator',
          notes: data.notes || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
        if (data.assignedRep) setAssignedTo(data.assignedRep);
      }
    } catch (err) {
      console.error('Failed to load inquiry:', err);
      errorToast('Failed to load inquiry details');
    } finally {
      setLoading(false);
    }
  };

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

  const handleClientSelect = (clientName: string, setFieldValue: any) => {
    setFieldValue('clientName', clientName);
    const matched = clientsList.find(c => c.companyName?.toLowerCase() === clientName.toLowerCase());
    if (matched) {
      setFieldValue('clientId', matched.id);
      if (matched.email) setFieldValue('clientEmail', matched.email);
      if (matched.phone) setFieldValue('clientPhone', matched.phone);
    }
  };

  const handleAutoComposeRequirements = (values: InquiryDTO, setFieldValue: any) => {
    const parts = [
      values.strapType?.replace(/\s*\(.*?\)/, ''),
      values.strapSize,
      values.surfaceFinish,
      values.color
    ].filter(Boolean);
    const composed = parts.join(' ');
    if (composed) {
      setFieldValue('requirements', composed);
    }
  };

  const handleSubmit = async (values: InquiryDTO, { setSubmitting, resetForm }: any) => {
    try {
      setSubmitting(true);
      const payload: Partial<InquiryDTO> = {
        ...values,
        sizeInTons: Number(values.sizeInTons || 0),
        quotedPrice: Number(values.quotedPrice || 0),
        assignedRep: assignedTo
      };

      if (isEditMode && id) {
        const updated = await updateInquiry(id, payload);
        successToast('Inquiry updated successfully');
        resetForm({ values: updated });
        setInitialValues(updated);
      } else {
        const created = await createInquiry(payload);
        successToast('Inquiry created successfully');
        if (created?.id) {
          navigate(`/inquiries/${created.id}`);
        } else {
          navigate('/inquiries');
        }
      }
    } catch (err: any) {
      console.error('Save inquiry error:', err);
      errorToast(err?.message || 'Failed to save inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const clientOptions = useMemo(() => {
    return clientsList.map(c => ({
      label: c.companyName,
      value: c.companyName
    }));
  }, [clientsList]);

  if (loading) {
    return (
      <ERPFormPageLayout
        header={
          <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6">
            <span className="text-sm text-gray-500">Loading inquiry...</span>
          </div>
        }
      >
        <div className="flex items-center justify-center py-24 text-gray-500 text-sm gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
          <span>Loading Customer Inquiry details...</span>
        </div>
      </ERPFormPageLayout>
    );
  }

  const getStatusVariant = (st: string): 'success' | 'warning' | 'error' | 'info' | 'gray' | 'blue' => {
    switch (st) {
      case 'Won': return 'success';
      case 'Under Review': return 'warning';
      case 'Lost': return 'error';
      case 'Quoted': return 'blue';
      case 'Open':
      default: return 'info';
    }
  };

  return (
    <Formik
      innerRef={formikRef}
      initialValues={initialValues}
      validationSchema={inquiryValidationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ values, handleChange, handleBlur, setFieldValue, dirty, isSubmitting }) => {
        const estimatedOrderValue = (Number(values.sizeInTons || 0) * 1000 * Number(values.quotedPrice || 0));

        return (
          <ERPFormPageLayout
            recordCode={values.inquiryNumber || (isEditMode ? id : 'NEW-INQUIRY')}
            header={
              <ERPFormHeader
                title={values.inquiryNumber ? `${values.inquiryNumber} - ${values.clientName || 'Inquiry'}` : 'New Customer Inquiry'}
                onBack={() => navigate('/inquiries')}
                backTitle="Back to Inquiries"
                statusBadge={{
                  label: values.status,
                  variant: getStatusVariant(values.status)
                }}
                extraBadges={[
                  { label: `${Number(values.sizeInTons || 0).toFixed(2)} Tons`, variant: 'gray' },
                  { label: `₹${Number(values.quotedPrice || 0).toLocaleString()}/kg`, variant: 'blue' }
                ]}
                customActions={
                  <button
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams({
                        customerName: values.clientName || '',
                        inquiryId: values.inquiryNumber || values.id || '',
                        tons: String(values.sizeInTons || ''),
                        rate: String(values.quotedPrice || '')
                      });
                      navigate(`/quotations?${params.toString()}`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                    title="Convert this Inquiry into a Sales Quotation"
                  >
                    <span>Create Quotation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                }
                dirty={dirty || !isEditMode}
                onPrint={() => window.print()}
                moreMenuItems={[
                  {
                    label: 'Create Quotation from Inquiry',
                    icon: <ArrowRight className="w-4 h-4 text-emerald-600" />,
                    onClick: () => {
                      const params = new URLSearchParams({
                        customerName: values.clientName || '',
                        inquiryId: values.inquiryNumber || values.id || '',
                        tons: String(values.sizeInTons || ''),
                        rate: String(values.quotedPrice || '')
                      });
                      navigate(`/quotations?${params.toString()}`);
                    }
                  },
                  {
                    label: 'Copy Inquiry Number',
                    onClick: () => {
                      if (values.inquiryNumber) {
                        navigator.clipboard.writeText(values.inquiryNumber);
                        successToast('Inquiry ID copied to clipboard');
                      }
                    }
                  },
                  {
                    label: 'Back to Inquiries List',
                    onClick: () => navigate('/inquiries')
                  }
                ]}
                onSave={async () => {
                  if (formikRef.current) {
                    const errs = await formikRef.current.validateForm();
                    if (errs && Object.keys(errs).length > 0) {
                      Object.keys(errs).forEach(key => formikRef.current?.setFieldTouched(key, true, false));
                      const firstErrKey = Object.keys(errs)[0];
                      const firstErrMsg = (errs as any)[firstErrKey];
                      errorToast(`Cannot save: ${firstErrMsg}`);
                      return;
                    }
                    formikRef.current.submitForm();
                  }
                }}
                isSubmitting={isSubmitting}
                saveLabel={isEditMode ? 'Update Inquiry' : 'Save Inquiry'}
              />
            }
          >
            <Form noValidate className="space-y-6 w-full font-sans">
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                
                {/* LEFT META SIDEBAR PANEL */}
                <div className="w-full lg:w-[290px] shrink-0 space-y-4">
                  
                  {/* Inquiry Metric Summary Card */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 border border-emerald-200/80 rounded-2xl p-5 space-y-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Inquiry Value</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                        {values.status}
                      </span>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-emerald-950 font-mono tracking-tight flex items-center">
                        <span className="text-base font-semibold mr-0.5">₹</span>
                        {estimatedOrderValue.toLocaleString('en-IN')}
                      </div>
                      <p className="text-[11px] text-emerald-700/80 mt-0.5">
                        {Number(values.sizeInTons || 0).toFixed(2)} Tons @ ₹{Number(values.quotedPrice || 0)}/kg
                      </p>
                    </div>

                    <div className="pt-2 border-t border-emerald-200/60 space-y-1.5 text-xs text-gray-700">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Weight (Kg):</span>
                        <span className="font-semibold font-mono">{(Number(values.sizeInTons || 0) * 1000).toLocaleString()} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Target Rate:</span>
                        <span className="font-semibold font-mono">₹{values.quotedPrice || 0}/kg</span>
                      </div>
                    </div>

                    {/* Quick Convert Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const params = new URLSearchParams({
                          customerName: values.clientName || '',
                          inquiryId: values.inquiryNumber || values.id || '',
                          tons: String(values.sizeInTons || ''),
                          rate: String(values.quotedPrice || '')
                        });
                        navigate(`/quotations?${params.toString()}`);
                      }}
                      className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Convert to Quotation
                    </button>
                  </div>

                  {/* Metadata Card */}
                  <div className="bg-white border border-gray-200/90 rounded-2xl p-5 space-y-4 shadow-2xs">
                    
                    {/* Assigned Sales Rep */}
                    <div className="space-y-1.5 border-b border-gray-100 pb-3">
                      <span className="text-gray-500 font-medium text-xs flex items-center gap-2">
                        <UserPlus className="w-3.5 h-3.5 text-gray-400" />
                        Assigned Sales Rep
                      </span>
                      <input
                        type="text"
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        placeholder="Representative name..."
                        className="w-full text-xs font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Attachments */}
                    <div className="space-y-2 border-b border-gray-100 pb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium flex items-center gap-2">
                          <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                          Specs & Drawings
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.onchange = (e: any) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setAttachments(prev => [...prev, { name: file.name, url: URL.createObjectURL(file) }]);
                                successToast('File attached');
                              }
                            };
                            input.click();
                          }}
                          className="text-emerald-700 font-semibold text-xs hover:underline cursor-pointer"
                        >
                          + Upload
                        </button>
                      </div>
                      {attachments.length === 0 ? (
                        <p className="text-[11px] text-gray-400 italic">No attachments added</p>
                      ) : (
                        attachments.map((att, idx) => (
                          <div key={idx} className="text-xs text-gray-700 truncate font-medium bg-gray-50 p-1.5 rounded border border-gray-100">
                            {att.name}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Tags */}
                    <div className="space-y-2 border-b border-gray-100 pb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-gray-400" />
                          Inquiry Tags
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowTagInput(true)}
                          className="text-emerald-700 font-semibold text-xs hover:underline cursor-pointer"
                        >
                          + Add Tag
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {tags.map((t, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            {t}
                            <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-red-500 cursor-pointer">×</button>
                          </span>
                        ))}
                      </div>
                      {showTagInput && (
                        <div className="flex items-center gap-1 pt-1">
                          <input
                            type="text"
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                            placeholder="e.g. URGENT, EXPORT"
                            className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-emerald-500"
                          />
                          <button type="button" onClick={handleAddTag} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs">Add</button>
                        </div>
                      )}
                    </div>

                    {/* Share Link */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-gray-500 font-medium flex items-center gap-2">
                        <Share2 className="w-3.5 h-3.5 text-gray-400" />
                        Share Inquiry
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          successToast('Inquiry link copied to clipboard');
                        }}
                        className="text-emerald-700 font-semibold text-xs hover:underline cursor-pointer"
                      >
                        Copy Link
                      </button>
                    </div>

                  </div>

                </div>

                {/* RIGHT MAIN DETAILS CARDS */}
                <div className="flex-1 w-full space-y-6">
                  
                  {/* SECTION 1: CLIENT INFORMATION */}
                  <div className="bg-white border border-gray-200/90 rounded-2xl p-6 sm:p-7 space-y-6 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-gray-900 tracking-tight">Client Information</h2>
                          <p className="text-xs text-gray-500">Customer account and contact details</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        {clientOptions.length > 0 ? (
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-gray-700">
                              Client Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              list="client-options-list"
                              name="clientName"
                              placeholder="Type or select client name..."
                              value={values.clientName}
                              onChange={(e) => handleClientSelect(e.target.value, setFieldValue)}
                              onBlur={handleBlur}
                              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                            />
                            <datalist id="client-options-list">
                              {clientOptions.map((opt, i) => (
                                <option key={i} value={opt.value} />
                              ))}
                            </datalist>
                          </div>
                        ) : (
                          <TextFieldComponent
                            name="clientName"
                            label="Client Name *"
                            placeholder="Enter Client / Company Name"
                            value={values.clientName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                          />
                        )}
                      </div>

                      <div>
                        <SelectOutlinedField
                          name="status"
                          label="Inquiry Status *"
                          options={STATUS_OPTIONS}
                          value={values.status}
                          onChange={(val) => setFieldValue('status', val)}
                        />
                      </div>

                      <div>
                        <TextFieldComponent
                          name="clientPhone"
                          label="Contact Phone"
                          placeholder="e.g. +91 98765 43210"
                          value={values.clientPhone || ''}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          startIcon={<Phone className="w-4 h-4 text-gray-400" />}
                        />
                      </div>

                      <div>
                        <TextFieldComponent
                          name="clientEmail"
                          label="Contact Email"
                          placeholder="e.g. purchase@company.com"
                          value={values.clientEmail || ''}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          startIcon={<Mail className="w-4 h-4 text-gray-400" />}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: PRODUCT SPECIFICATIONS */}
                  <div className="bg-white border border-gray-200/90 rounded-2xl p-6 sm:p-7 space-y-6 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-gray-900 tracking-tight">Product & Strap Specification</h2>
                          <p className="text-xs text-gray-500">Configure exact strapping dimensions and manufacturing grade</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAutoComposeRequirements(values, setFieldValue)}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60"
                      >
                        Auto-Compose Spec
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <SelectOutlinedField
                          name="strapType"
                          label="Strap Material / Type"
                          options={STRAP_TYPE_OPTIONS}
                          value={values.strapType || ''}
                          onChange={(val) => {
                            setFieldValue('strapType', val);
                            setTimeout(() => {
                              if (formikRef.current) {
                                handleAutoComposeRequirements({ ...values, strapType: val }, setFieldValue);
                              }
                            }, 50);
                          }}
                        />
                      </div>

                      <div>
                        <SelectOutlinedField
                          name="strapSize"
                          label="Strap Size (Width x Thickness)"
                          options={STRAP_SIZE_OPTIONS}
                          value={values.strapSize || ''}
                          onChange={(val) => {
                            setFieldValue('strapSize', val);
                            setTimeout(() => {
                              if (formikRef.current) {
                                handleAutoComposeRequirements({ ...values, strapSize: val }, setFieldValue);
                              }
                            }, 50);
                          }}
                        />
                      </div>

                      <div>
                        <SelectOutlinedField
                          name="surfaceFinish"
                          label="Surface Finish"
                          options={SURFACE_FINISH_OPTIONS}
                          value={values.surfaceFinish || ''}
                          onChange={(val) => {
                            setFieldValue('surfaceFinish', val);
                            setTimeout(() => {
                              if (formikRef.current) {
                                handleAutoComposeRequirements({ ...values, surfaceFinish: val }, setFieldValue);
                              }
                            }, 50);
                          }}
                        />
                      </div>

                      <div>
                        <SelectOutlinedField
                          name="color"
                          label="Color"
                          options={COLOR_OPTIONS}
                          value={values.color || ''}
                          onChange={(val) => {
                            setFieldValue('color', val);
                            setTimeout(() => {
                              if (formikRef.current) {
                                handleAutoComposeRequirements({ ...values, color: val }, setFieldValue);
                              }
                            }, 50);
                          }}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <SelectOutlinedField
                          name="coreSize"
                          label="Core Size (ID x Traverse)"
                          options={CORE_SIZE_OPTIONS}
                          value={values.coreSize || ''}
                          onChange={(val) => setFieldValue('coreSize', val)}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <TextFieldComponent
                          name="requirements"
                          label="Requirements / Product Summary *"
                          placeholder="e.g. PET Strap 19mm x 0.8mm Embossed Green"
                          value={values.requirements}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: COMMERCIAL & QUANTITY TERMS */}
                  <div className="bg-white border border-gray-200/90 rounded-2xl p-6 sm:p-7 space-y-6 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold">
                          <IndianRupee className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-gray-900 tracking-tight">Commercial & Quantity Details</h2>
                          <p className="text-xs text-gray-500">Volume requirement, pricing, and expected delivery date</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <TextFieldComponent
                          type="number"
                          name="sizeInTons"
                          label="Quantity (Tons) *"
                          placeholder="e.g. 10"
                          value={values.sizeInTons}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                        <span className="text-[10px] text-gray-500 mt-1 block">
                          = {(Number(values.sizeInTons || 0) * 1000).toLocaleString()} kg
                        </span>
                      </div>

                      <div>
                        <TextFieldComponent
                          type="number"
                          name="quotedPrice"
                          label="Target / Quoted Rate (₹/kg) *"
                          placeholder="e.g. 112"
                          value={values.quotedPrice}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          startIcon={<span className="text-xs font-bold text-gray-500">₹</span>}
                        />
                        <span className="text-[10px] text-gray-500 mt-1 block">
                          Per Kilogram (ex-factory)
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Calculated Est. Value
                        </label>
                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-900 font-mono h-[38px] flex items-center">
                          ₹ {estimatedOrderValue.toLocaleString('en-IN')}
                        </div>
                        <span className="text-[10px] text-emerald-600 font-medium mt-1 block">
                          Auto-calculated (Tons × 1,000 × ₹/kg)
                        </span>
                      </div>

                      <div>
                        <TextFieldComponent
                          type="date"
                          name="deliveryDate"
                          label="Expected Delivery Date"
                          value={values.deliveryDate || ''}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <TextFieldComponent
                          name="notes"
                          label="Special Remarks / Technical Notes"
                          placeholder="e.g. Urgent delivery required for warehouse expansion; tensile strength >= 700 kgf"
                          value={values.notes || ''}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </Form>
          </ERPFormPageLayout>
        );
      }}
    </Formik>
  );
};

export const InquiryFormPage = WithAuth(InquiryFormPageBase, ModuleName.INQUIRIES, Permission.ADD);
export default InquiryFormPage;

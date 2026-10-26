import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  InputAdornment 
} from '@mui/material';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { ERPFormHeader, ERPFormPageLayout } from '../../components/ERPForm';
import { FormCommentsAndActivity, triggerActivityRefresh } from '../../components/FormCommentsAndActivity';
import WithAuth from '../../components/WithAuth';
import { useSelector } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';
import { 
  fetchCustomerById, 
  createCustomer, 
  updateCustomer, 
  uploadFile,
  type Customer 
} from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { TextFieldComponent, SelectOutlinedField } from '../../components/input/index';
import { 
  ArrowLeft, 
  Printer, 
  Plus, 
  Heart, 
  MessageSquare, 
  Share2, 
  Paperclip, 
  UserPlus, 
  Tag, 
  Loader2, 
  Camera, 
  ChevronDown, 
  ChevronUp, 
  MoreHorizontal, 
  ExternalLink, 
  Trash2, 
  Building, 
  Mail, 
  Phone,
  Check,
  MapPin
} from 'lucide-react';

interface AddressDetail {
  id: string;
  type: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  phoneNo?: string;
  faxNo?: string;
  email?: string;
  website?: string;
  vatNo?: string;
  cstNo?: string;
  gstin?: string;
}

const customerValidationSchema = Yup.object({
  customerName: Yup.string().trim().required('Customer Name is required'),
  customerType: Yup.string().required('Customer Type is required'),
  customerGroup: Yup.string().required('Customer Group is required'),
  billingCurrency: Yup.string().required('Billing Currency is required')
});

const muiAddressFieldSx = {
  '& .MuiInputLabel-root': {
    color: '#4b5563',
    fontWeight: 600,
    fontSize: '0.8125rem'
  },
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    fontSize: '0.8125rem',
    minHeight: '42px',
    '& fieldset': {
      borderColor: '#e5e7eb'
    },
    '&:hover fieldset': {
      borderColor: '#cbd5e1'
    },
    '&.Mui-focused fieldset': {
      borderColor: '#059669',
      borderWidth: '2px'
    }
  },
  '& .MuiInputBase-input': {
    fontSize: '0.8125rem'
  }
};

const CustomerFormPageBase: React.FC = () => {
  const { user } = useSelector((state: any) => state.base);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id && id !== 'new');

  const [loading, setLoading] = useState(isEditMode);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<
    'details' | 'dashboard' | 'contact' | 'tax' | 'accounting' | 'sales' | 'settings' | 'portal'
  >('details');

  // Left Sidebar States
  const [assignedTo, setAssignedTo] = useState(user?.name || user?.username || 'Administrator');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [following, setFollowing] = useState(false);

  // Upload States
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Accordion states
  const [showConnections, setShowConnections] = useState(true);
  const [connectionCounts, setConnectionCounts] = useState<{
    productionOrders?: number;
    invoices?: number;
    payments?: number;
    inquiries?: number;
  }>({});

  // Address Works Management States
  const [addressesList, setAddressesList] = useState<AddressDetail[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<Partial<AddressDetail>>({
    type: 'Registered Office',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pinCode: '',
    phoneNo: '',
    email: '',
    website: '',
    vatNo: '',
    gstin: ''
  });
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Header Options Menu
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const formikRef = useRef<any>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Initial Values
  const [initialValues, setInitialValues] = useState<any>({
    name: '',
    customerName: '',
    customerType: 'Company',
    customerGroup: 'Commercial',
    territory: 'India',
    fromLead: '',
    fromOpportunity: '',
    fromProspect: '',
    accountManager: '',
    isAuthOtpApplied: false,
    defaultAuthOtpMethod: '',
    defaultPriceList: 'Standard Selling',
    billingCurrency: 'INR',
    defaultCompanyBankAccount: '',
    internalCustomer: '',
    isAutoCloseDn: false,
    contact: '',
    email: '',
    contactPersonName: '',
    taxId: '',
    vrnNo: '',
    taxCategory: 'Standard Rate',
    receivableAccount: 'Debtors - PS',
    paymentTerms: 'Net 30',
    creditLimit: 0,
    trackExchangeDifferences: true,
    salesPerson: '',
    contributionPercent: 100,
    allowSoWithoutSopp: false,
    disabled: false,
    assignedTo: '',
    tags: '',
    imageUrl: '',
    address: '',
    city: '',
    state: '',
    country: 'India'
  });

  useEffect(() => {
    if (id && id !== 'new') {
      loadCustomer(id);
    }
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCustomer = async (customerId: string) => {
    setLoading(true);
    try {
      const data = await fetchCustomerById(customerId);

      if (data) {
        const fullCustomerName = data.customerName || data.name || '';
        setInitialValues({
          ...data,
          name: fullCustomerName,
          customerName: fullCustomerName,
          customerType: data.customerType || 'Company',
          customerGroup: data.customerGroup || 'Commercial',
          territory: data.territory || 'India',
          fromLead: data.fromLead || '',
          fromOpportunity: data.fromOpportunity || '',
          fromProspect: data.fromProspect || '',
          accountManager: data.accountManager || '',
          isAuthOtpApplied: data.isAuthOtpApplied || false,
          defaultAuthOtpMethod: data.defaultAuthOtpMethod || '',
          defaultPriceList: data.defaultPriceList || 'Standard Selling',
          billingCurrency: data.billingCurrency || 'INR',
          defaultCompanyBankAccount: data.defaultCompanyBankAccount || '',
          internalCustomer: data.internalCustomer || '',
          isAutoCloseDn: data.isAutoCloseDn || false,
          contact: data.contact || '',
          phone: data.phone || data.contact || '',
          email: data.email || '',
          contactPersonName: data.contactPersonName || '',
          taxId: data.taxId || '',
          vrnNo: data.vrnNo || '',
          taxCategory: data.taxCategory || 'Standard Rate',
          receivableAccount: data.receivableAccount || 'Debtors - PS',
          paymentTerms: data.paymentTerms || 'Net 30',
          creditLimit: data.creditLimit || 0,
          trackExchangeDifferences: data.trackExchangeDifferences !== undefined ? data.trackExchangeDifferences : true,
          salesPerson: data.salesPerson || '',
          contributionPercent: data.contributionPercent || 100,
          allowSoWithoutSopp: data.allowSoWithoutSopp || false,
          disabled: data.disabled || false,
          assignedTo: data.assignedTo || '',
          tags: typeof data.tags === 'string' ? data.tags : (Array.isArray(data.tags) ? (data.tags as any).join(',') : ''),
          imageUrl: data.imageUrl || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || 'India'
        });

        if (data.assignedTo) setAssignedTo(data.assignedTo);
        if (data.tags) {
          const tagArray = typeof data.tags === 'string'
            ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
            : Array.isArray(data.tags) ? data.tags : [];
          setTags(tagArray);
        }
        if (Array.isArray((data as any).attachments)) setAttachments((data as any).attachments);
        if ((data as any)._count) setConnectionCounts((data as any)._count);

        let parsedAddresses: any[] = [];
        if (typeof data.addresses === 'string') {
          try {
            parsedAddresses = JSON.parse(data.addresses);
          } catch (e) {
            parsedAddresses = [];
          }
        } else if (Array.isArray(data.addresses)) {
          parsedAddresses = data.addresses;
        }

        let loadedAddresses: AddressDetail[] = [];
        if (parsedAddresses.length > 0) {
          loadedAddresses = parsedAddresses.map((a: any, idx: number) => ({
            id: a.id || `addr-${idx}`,
            type: a.type || 'Registered Office',
            address: a.address || '',
            city: a.city || '',
            state: a.state || '',
            country: a.country || 'India',
            pinCode: a.pinCode || a.postalCode || '',
            phoneNo: a.phoneNo || a.phone || data.contact || '',
            faxNo: a.faxNo || '',
            email: a.email || data.email || '',
            website: a.website || '',
            vatNo: a.vatNo || '',
            cstNo: a.cstNo || '',
            gstin: a.gstin || ''
          }));
        } else if (data.address || data.city) {
          const mainAddr: AddressDetail = {
            id: 'addr-main',
            type: 'Registered Office',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            country: data.country || 'India',
            pinCode: data.postalCode || '',
            phoneNo: data.contact || '',
            faxNo: '',
            email: data.email || '',
            website: data.website || '',
            vatNo: '',
            cstNo: '',
            gstin: ''
          };
          loadedAddresses = [mainAddr];
        }

        if (loadedAddresses.length > 0) {
          setAddressesList(loadedAddresses);
          setSelectedAddressId(loadedAddresses[0].id);
          setAddressForm(loadedAddresses[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load customer:', err);
      errorToast('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (nameStr: string) => {
    if (!nameStr) return 'CS';
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const handleAddTag = () => {
    if (newTagInput.trim()) {
      const tagUpper = newTagInput.trim().toUpperCase();
      if (!tags.includes(tagUpper)) {
        const updated = [...tags, tagUpper];
        setTags(updated);
        if (formikRef.current) {
          formikRef.current.setFieldValue('tags', updated.join(','));
        }
      }
      setNewTagInput('');
      setShowTagInput(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = tags.filter(t => t !== tagToRemove);
    setTags(updated);
    if (formikRef.current) {
      formikRef.current.setFieldValue('tags', updated.join(','));
    }
  };

  // Address Handlers
  const handleSelectAddressRow = (addr: AddressDetail) => {
    setSelectedAddressId(addr.id);
    setAddressForm({ ...addr });
  };

  const handleSaveAddress = async () => {
    if (!addressForm.address && !addressForm.city) {
      errorToast('Please enter an address or city');
      return;
    }

    let updatedList: AddressDetail[];
    if (selectedAddressId) {
      updatedList = addressesList.map(a => 
        a.id === selectedAddressId 
          ? { ...(addressForm as AddressDetail), id: selectedAddressId } 
          : a
      );
    } else {
      const newAddr: AddressDetail = {
        id: `addr-${Date.now()}`,
        type: addressForm.type || 'Registered Office',
        address: addressForm.address || '',
        city: addressForm.city || '',
        state: addressForm.state || '',
        country: addressForm.country || 'India',
        pinCode: addressForm.pinCode || '',
        phoneNo: addressForm.phoneNo || '',
        faxNo: addressForm.faxNo || '',
        email: addressForm.email || '',
        website: addressForm.website || '',
        vatNo: addressForm.vatNo || '',
        cstNo: addressForm.cstNo || '',
        gstin: addressForm.gstin || ''
      };
      updatedList = [...addressesList, newAddr];
      setSelectedAddressId(newAddr.id);
    }

    setAddressesList(updatedList);

    const primaryAddr = updatedList.find(a => a.type === 'Registered Office') || updatedList[0];

    // Sync to Formik values
    if (formikRef.current) {
      if (primaryAddr) {
        formikRef.current.setFieldValue('address', primaryAddr.address);
        formikRef.current.setFieldValue('city', primaryAddr.city);
        formikRef.current.setFieldValue('state', primaryAddr.state);
        formikRef.current.setFieldValue('postalCode', primaryAddr.pinCode);
      }
    }

    // If customer already exists in DB (Edit mode), immediately save to database!
    if (isEditMode && id) {
      try {
        setIsSavingAddress(true);
        const formikVals = formikRef.current?.values || initialValues;
        const payload = {
          ...formikVals,
          name: formikVals.customerName || formikVals.name,
          companyName: formikVals.customerName || formikVals.name,
          assignedTo,
          tags: tags.join(','),
          creditLimit: parseFloat(formikVals.creditLimit) || 0,
          attachments: attachments,
          address: primaryAddr?.address || formikVals.address,
          city: primaryAddr?.city || formikVals.city,
          state: primaryAddr?.state || formikVals.state,
          postalCode: primaryAddr?.pinCode || formikVals.postalCode,
          addresses: updatedList
        };
        await updateCustomer(id, payload);
        triggerActivityRefresh('Customer', id);
        successToast('Address saved to database successfully');
      } catch (err: any) {
        console.error('Failed to save address to DB:', err);
        errorToast(err?.response?.data?.error || 'Failed to save address to server');
      } finally {
        setIsSavingAddress(false);
      }
    } else {
      successToast('Address updated successfully');
    }
  };

  const handleClearAddressForm = () => {
    setSelectedAddressId(null);
    setAddressForm({
      type: 'Registered Office',
      address: '',
      city: '',
      state: '',
      country: 'India',
      pinCode: '',
      phoneNo: '',
      faxNo: '',
      email: '',
      website: '',
      vatNo: '',
      cstNo: '',
      gstin: ''
    });
  };

  const handleDeleteAddress = async () => {
    if (!selectedAddressId) return;
    const updatedList = addressesList.filter(a => a.id !== selectedAddressId);
    setAddressesList(updatedList);
    handleClearAddressForm();

    const primaryAddr = updatedList.find(a => a.type === 'Registered Office') || updatedList[0];
    if (formikRef.current) {
      formikRef.current.setFieldValue('address', primaryAddr?.address || '');
      formikRef.current.setFieldValue('city', primaryAddr?.city || '');
      formikRef.current.setFieldValue('state', primaryAddr?.state || '');
      formikRef.current.setFieldValue('postalCode', primaryAddr?.pinCode || '');
    }

    if (isEditMode && id) {
      try {
        const formikVals = formikRef.current?.values || initialValues;
        const payload = {
          ...formikVals,
          name: formikVals.customerName || formikVals.name,
          companyName: formikVals.customerName || formikVals.name,
          assignedTo,
          tags: tags.join(','),
          creditLimit: parseFloat(formikVals.creditLimit) || 0,
          attachments: attachments,
          address: primaryAddr?.address || '',
          city: primaryAddr?.city || '',
          state: primaryAddr?.state || '',
          postalCode: primaryAddr?.pinCode || '',
          addresses: updatedList
        };
        await updateCustomer(id, payload);
        triggerActivityRefresh('Customer', id);
        successToast('Address deleted and saved');
      } catch (err: any) {
        console.error('Failed to delete address on server:', err);
        errorToast('Failed to delete address on server');
      }
    } else {
      successToast('Address deleted');
    }
  };

  const handleSubmit = async (values: any, { setSubmitting, resetForm }: any) => {
    try {
      setSubmitting(true);

      // Auto-merge any pending uncommitted addressForm changes into currentAddresses
      let currentAddresses = [...addressesList];
      if (addressForm.address || addressForm.city) {
        if (selectedAddressId) {
          currentAddresses = currentAddresses.map(a => 
            a.id === selectedAddressId 
              ? { ...(addressForm as AddressDetail), id: selectedAddressId } 
              : a
          );
        } else if (addressForm.address) {
          const newAddr: AddressDetail = {
            id: `addr-${Date.now()}`,
            type: addressForm.type || 'Registered Office',
            address: addressForm.address || '',
            city: addressForm.city || '',
            state: addressForm.state || '',
            country: addressForm.country || 'India',
            pinCode: addressForm.pinCode || '',
            phoneNo: addressForm.phoneNo || '',
            faxNo: addressForm.faxNo || '',
            email: addressForm.email || '',
            website: addressForm.website || '',
            vatNo: addressForm.vatNo || '',
            cstNo: addressForm.cstNo || '',
            gstin: addressForm.gstin || ''
          };
          currentAddresses.push(newAddr);
        }
      }

      const primaryAddr = currentAddresses.find(a => a.type === 'Registered Office') || currentAddresses[0];

      const payload = {
        ...values,
        name: values.customerName || values.name,
        companyName: values.customerName || values.name,
        assignedTo,
        tags: tags.join(','),
        creditLimit: parseFloat(values.creditLimit) || 0,
        attachments: attachments,
        address: primaryAddr?.address || values.address,
        city: primaryAddr?.city || values.city,
        state: primaryAddr?.state || values.state,
        postalCode: primaryAddr?.pinCode || values.postalCode,
        taxId: primaryAddr?.gstin || values.taxId,
        addresses: currentAddresses
      };

      if (isEditMode && id) {
        const updated = await updateCustomer(id, payload);
        const fullCustomerName = updated?.companyName || updated?.customerName || updated?.name || values.customerName || values.name;
        const newVals = {
          ...values,
          ...(updated || {}),
          name: fullCustomerName,
          customerName: fullCustomerName
        };
        setInitialValues(newVals);
        resetForm({ values: newVals });
        triggerActivityRefresh('Customer', id);
        successToast('Customer updated successfully');
      } else {
        const created = await createCustomer(payload);
        successToast('Customer saved successfully');
        if (created?.id) {
          triggerActivityRefresh('Customer', created.id);
          navigate(`/master/customers/${created.id}`);
        } else {
          navigate('/master/customers');
        }
      }
    } catch (err: any) {
      console.error('Save customer error:', err);
      errorToast(err?.response?.data?.error || 'Failed to save customer');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full text-gray-500 text-sm gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
          <span>Loading Customer details...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <Formik
      innerRef={formikRef}
      initialValues={initialValues}
      validationSchema={customerValidationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ values, setFieldValue, dirty, isSubmitting }) => (
        <ERPFormPageLayout
          recordCode={initialValues?.customerCode || (initialValues?.id !== undefined ? String(initialValues.id) : undefined) || (isEditMode ? 'CUST-0001' : undefined)}
          header={
            <ERPFormHeader
              title={values.customerName || 'Untitled Customer'}
              onBack={() => navigate('/master/customers')}
              backTitle="Back to Customers"
              statusBadge={{
                label: (isEditMode ? initialValues?.disabled : values.disabled) ? 'Disabled' : 'Enabled',
                variant: (isEditMode ? initialValues?.disabled : values.disabled) ? 'error' : 'blue'
              }}
              dirty={dirty || !isEditMode}
              onDuplicate={() => {
                const dup = { ...values, customerName: `${values.customerName} (Copy)` };
                setInitialValues(dup);
                successToast('Customer duplicated');
              }}
              onPrint={() => window.print()}
              moreMenuItems={[
                {
                  label: 'Copy Customer Name',
                  onClick: () => {
                    navigator.clipboard.writeText(values.customerName);
                    successToast('Copied customer name to clipboard');
                  }
                },
                {
                  label: 'Back to Customer List',
                  onClick: () => navigate('/master/customers')
                }
              ]}
              onSave={async () => {
                if (formikRef.current) {
                  const errs = await formikRef.current.validateForm();
                  if (errs && Object.keys(errs).length > 0) {
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
          <Form noValidate className="space-y-6 w-full font-sans">
            {/* 2. MAIN SPLIT LAYOUT (2-COLUMN CARDS ON DESKTOP, STACKED ON TABLET) */}
            <div className="flex flex-col xl:flex-row gap-6 items-start">
              
              {/* LEFT META SIDEBAR PANEL (~280px) */}
              <div className="w-full xl:w-72 shrink-0 space-y-6 md:space-y-0 md:grid md:grid-cols-2 md:gap-6 xl:block xl:space-y-6">
                
                {/* Logo / Avatar Box Card */}
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm p-2">
                  <div className="relative group w-full h-56 rounded-xl overflow-hidden cursor-pointer border border-gray-100 bg-gray-50/80 flex items-center justify-center">
                    {values.imageUrl ? (
                      <img 
                        src={values.imageUrl} 
                        alt={values.customerName} 
                        className="w-full h-full object-contain p-2 rounded-xl" 
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-gray-100 flex items-center justify-center text-4xl font-black text-gray-400 select-none">
                        {getInitials(values.customerName)}
                      </div>
                    )}

                    {/* Hover Overlay with Upload Trigger */}
                    {!uploadingImage && (
                      <label className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center cursor-pointer rounded-xl backdrop-blur-[1px]">
                        <span className="bg-white/95 hover:bg-white text-gray-800 text-xs font-bold px-3.5 py-2 rounded-lg shadow-md flex items-center gap-1.5 transition-transform scale-95 group-hover:scale-100 select-none">
                          <Camera className="w-3.5 h-3.5 text-gray-600" />
                          Change Logo
                          <ChevronDown className="w-3 h-3 text-gray-600" />
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingImage}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              setUploadingImage(true);
                              const res = await uploadFile(file);
                              setFieldValue('imageUrl', res.url);
                              if (isEditMode && id) {
                                await updateCustomer(id, { imageUrl: res.url, customerName: values.customerName });
                              }
                              successToast('Logo uploaded successfully');
                            } catch (err) {
                              errorToast('Failed to upload logo');
                            } finally {
                              setUploadingImage(false);
                            }
                          }}
                        />
                      </label>
                    )}

                    {uploadingImage && (
                      <div className="absolute inset-0 bg-white/90 rounded-2xl flex flex-col items-center justify-center gap-1.5 backdrop-blur-[1px] z-20">
                        <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                        <span className="text-[10px] font-bold text-gray-600">Uploading...</span>
                      </div>
                    )}

                    {values.imageUrl && !uploadingImage && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setFieldValue('imageUrl', '');
                          if (isEditMode && id) {
                            await updateCustomer(id, { imageUrl: '', customerName: values.customerName });
                          }
                        }}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md transition-all opacity-0 group-hover:opacity-100 z-30 cursor-pointer"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Meta Controls Card */}
                <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4 text-xs shadow-sm">
                  
                  {/* Assigned To */}
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-gray-500 flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-gray-400" /> Assigned To
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(!showAssignModal)}
                      className="text-primary-600 font-bold hover:underline cursor-pointer"
                    >
                      {assignedTo ? assignedTo : '+ Add'}
                    </button>
                  </div>
                  {showAssignModal && (
                    <div className="p-2 bg-gray-50 border border-gray-200 rounded-xl space-y-1 animate-in fade-in">
                      {Array.from(new Set(['Administrator', 'System User', user?.name || user?.username || 'Admin'])).map((uName) => (
                        <button
                          key={uName}
                          type="button"
                          onClick={() => {
                            setAssignedTo(uName);
                            setShowAssignModal(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white text-gray-700 text-xs transition-colors font-medium cursor-pointer"
                        >
                          {uName}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Attachments */}
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-gray-400" /> Attachments
                    </span>
                    <label className="text-primary-600 font-bold hover:underline cursor-pointer flex items-center gap-1">
                      {uploadingAttachment ? (
                        <span className="flex items-center gap-1 text-gray-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                        </span>
                      ) : (
                        <span>+ Upload</span>
                      )}
                      <input 
                        type="file" 
                        className="hidden" 
                        disabled={uploadingAttachment}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setUploadingAttachment(true);
                            const res = await uploadFile(file);
                            const updated = [...attachments, { name: res.filename, url: res.url }];
                            setAttachments(updated);
                            if (isEditMode && id) {
                              await updateCustomer(id, { attachments: updated as any, customerName: values.customerName });
                            }
                            successToast('File attached successfully');
                          } catch (err) {
                            errorToast('Failed to upload attachment');
                          } finally {
                            setUploadingAttachment(false);
                          }
                        }}
                      />
                    </label>
                  </div>
                  {attachments.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-xl text-[11px] text-gray-700 font-medium">
                          <a href={att.url} target="_blank" rel="noopener noreferrer" className="truncate hover:text-primary-600 hover:underline flex items-center gap-1 max-w-[170px]">
                            <span className="truncate">{att.name}</span>
                            {att.url !== '#' && <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />}
                          </a>
                          <button 
                            type="button" 
                            onClick={async () => {
                              const updated = attachments.filter((_, i) => i !== idx);
                              setAttachments(updated);
                              if (isEditMode && id) {
                                await updateCustomer(id, { attachments: updated as any, customerName: values.customerName });
                              }
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
                        className="text-primary-600 font-bold hover:underline cursor-pointer"
                      >
                        + Add Tag
                      </button>
                    </div>
                    {showTagInput && (
                      <div className="flex gap-1.5 pt-1">
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                          placeholder="TAG..."
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none uppercase font-bold"
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                        >
                          Add
                        </button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tags.map(t => (
                        <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 text-gray-800 text-[11px] font-black border border-gray-200">
                          {t}
                          <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-red-600 font-bold">×</button>
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
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        successToast('Customer link copied to clipboard');
                      }}
                      className="text-primary-600 font-bold hover:underline cursor-pointer"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>

              </div>

              {/* 3. RIGHT FORM CARD WITH ERP TABS */}
              <div className="flex-1 w-full bg-white border border-gray-200 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden flex flex-col">
                
                {/* ERP Tabs Header */}
                <div className="border-b border-gray-200 bg-gray-50/50 px-3 sm:px-6 flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
                  {[
                    { id: 'details', label: 'Details' },
                    { id: 'dashboard', label: 'Dashboard' },
                    { id: 'contact', label: 'Address & Contact' },
                    { id: 'tax', label: 'Tax' },
                    // { id: 'accounting', label: 'Accounting' },
                    { id: 'sales', label: 'Sales Team' },
                    { id: 'settings', label: 'Settings' },
                    // { id: 'portal', label: 'Portal Users' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3.5 sm:px-5 py-3 sm:py-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-primary-600 text-primary-700 bg-white shadow-2xs'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* TAB 1: DETAILS */}
                {activeTab === 'details' && (
                  <div className="p-3 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
                    
                    {/* Main Customer Fields Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-6">
                      
                      {/* Left Column */}
                      <div className="flex flex-col gap-6">
                        <TextFieldComponent 
                          name="customerName" 
                          label="Customer Name *" 
                          placeholder="e.g. Gold Star Paints Ltd" 
                        />

                        <SelectOutlinedField
                          name="customerType"
                          label="Customer Type *"
                          options={[
                            { value: 'Company', label: 'Company' },
                            { value: 'Individual', label: 'Individual' },
                            { value: 'Partnership', label: 'Partnership' }
                          ]}
                        />

                        <SelectOutlinedField
                          name="customerGroup"
                          label="Customer Group"
                          options={[
                            { value: 'All Customer Groups', label: 'All Customer Groups' },
                            { value: 'Commercial', label: 'Commercial' },
                            { value: 'Retail', label: 'Retail' },
                            { value: 'Industrial', label: 'Industrial' }
                          ]}
                        />

                      </div>

                      {/* Right Column */}
                      <div className="flex flex-col gap-6">
                        <SelectOutlinedField
                          name="territory"
                          label="Territory"
                          options={[
                            { value: 'India', label: 'India' },
                            { value: 'Tanzania', label: 'Tanzania' },
                            { value: 'Kenya', label: 'Kenya' },
                            { value: 'Uganda', label: 'Uganda' },
                            { value: 'All Territories', label: 'All Territories' }
                          ]}
                        />

                        <TextFieldComponent 
                          name="fromLead" 
                          label="From Lead" 
                          placeholder="Lead reference" 
                        />


                        <TextFieldComponent 
                          name="accountManager" 
                          label="Account Manager" 
                          placeholder="Manager name" 
                        />
                      </div>

                    </div>

                    {/* DEFAULTS SECTION */}
                    <div className="border-t border-gray-200 pt-6 space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Defaults</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SelectOutlinedField
                          name="defaultPriceList"
                          label="Default Price List"
                          options={[
                            { value: 'Standard Selling', label: 'Standard Selling' },
                            { value: 'Export Price List', label: 'Export Price List' }
                          ]}
                        />

                        <SelectOutlinedField
                          name="billingCurrency"
                          label="Billing Currency"
                          options={[
                            { value: 'INR', label: 'INR (₹)' },
                            { value: 'USD', label: 'USD ($)' },
                            { value: 'EUR', label: 'EUR (€)' },
                            { value: 'TZS', label: 'TZS' }
                          ]}
                        />

                        <div className="md:col-span-2">
                          <TextFieldComponent 
                            name="defaultCompanyBankAccount" 
                            label="Default Company Bank Account" 
                            placeholder="Bank account number / details" 
                          />
                        </div>
                      </div>
                    </div>


                  </div>
                )}

                {/* TAB 2: DASHBOARD */}
                {activeTab === 'dashboard' && (
                  <div className="p-6 sm:p-8 space-y-8">
                    
                    {/* CONNECTIONS CARD */}
                    <div className="border border-gray-200 rounded-2xl p-6 bg-white space-y-5 shadow-2xs">
                      <div 
                        onClick={() => setShowConnections(!showConnections)}
                        className="flex items-center justify-between cursor-pointer select-none border-b border-gray-100 pb-3"
                      >
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">
                          Connections
                        </h3>
                        <button type="button" className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                          {showConnections ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                        </button>
                      </div>

                      {showConnections && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
                          
                          {/* Quotations Column */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quotations</h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const custName = values.customerName || initialValues.customerName || initialValues.name || '';
                                    navigate(`/quotations?customerName=${encodeURIComponent(custName)}&clientId=${id || ''}`);
                                  }}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                                >
                                  {(connectionCounts.inquiries || 0) > 0 && (
                                    <span className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                      {connectionCounts.inquiries}
                                    </span>
                                  )}
                                  <span>Quotation</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const custName = values.customerName || initialValues.customerName || initialValues.name || '';
                                    navigate(`/quotations?create=true&customerName=${encodeURIComponent(custName)}&clientId=${id || ''}`);
                                  }}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 p-1.5 rounded-lg transition-colors cursor-pointer"
                                  title="New Quotation"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Orders & Delivery Column */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Orders & Delivery</h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const custName = values.customerName || initialValues.customerName || initialValues.name || '';
                                    navigate(`/production-orders?customerName=${encodeURIComponent(custName)}&clientId=${id || ''}`);
                                  }}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                                >
                                  {(connectionCounts.productionOrders || 0) > 0 && (
                                    <span className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                      {connectionCounts.productionOrders}
                                    </span>
                                  )}
                                  <span>Production Order</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const custName = values.customerName || initialValues.customerName || initialValues.name || '';
                                    navigate(`/production-orders/new?customerId=${id || ''}&customerName=${encodeURIComponent(custName)}`);
                                  }}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 p-1.5 rounded-lg transition-colors cursor-pointer"
                                  title="New Production Order"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => successToast('Filtered Delivery Notes')}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                                >
                                  <span>Delivery Note</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => successToast('Create Delivery Note')}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 p-1.5 rounded-lg transition-colors cursor-pointer"
                                  title="New Delivery Note"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Invoicing Column */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Invoicing</h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const custName = values.customerName || initialValues.customerName || initialValues.name || '';
                                    navigate(`/invoices?party=${encodeURIComponent(custName)}&type=SALES&clientId=${id || ''}`);
                                  }}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                                >
                                  {(connectionCounts.invoices || 0) > 0 && (
                                    <span className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                      {connectionCounts.invoices}
                                    </span>
                                  )}
                                  <span>Sales Invoice</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const custName = values.customerName || initialValues.customerName || initialValues.name || '';
                                    navigate(`/invoices/new?party=${encodeURIComponent(custName)}&type=SALES&clientId=${id || ''}`);
                                  }}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 p-1.5 rounded-lg transition-colors cursor-pointer"
                                  title="New Sales Invoice"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const custName = values.customerName || initialValues.customerName || initialValues.name || '';
                                    navigate(`/invoices?party=${encodeURIComponent(custName)}&type=SALES&clientId=${id || ''}`);
                                  }}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                                >
                                  {(connectionCounts.payments || 0) > 0 && (
                                    <span className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                      {connectionCounts.payments}
                                    </span>
                                  )}
                                  <span>Payment Entry</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const custName = values.customerName || initialValues.customerName || initialValues.name || '';
                                    navigate(`/invoices/new?party=${encodeURIComponent(custName)}&type=SALES&clientId=${id || ''}`);
                                  }}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 p-1.5 rounded-lg transition-colors cursor-pointer"
                                  title="New Payment Entry"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* TAB 3: ADDRESS & CONTACT */}
                {activeTab === 'contact' && (
                  <div className="p-6 sm:p-8 space-y-8">
                    
                    {/* Multi-Address Works Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
                          <Building className="w-4 h-4 text-primary-600" /> Address Works & Delivery Addresses
                        </h3>
                        <button
                          type="button"
                          onClick={handleClearAddressForm}
                          className="bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 font-bold text-xs px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                        >
                          + Add Address
                        </button>
                      </div>

                      {/* Address Table */}
                      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[11px]">
                            <tr>
                              <th className="p-3 w-12 text-center">No.</th>
                              <th className="p-3">Address Type</th>
                              <th className="p-3">Address</th>
                              <th className="p-3">City / State</th>
                              <th className="p-3">Country</th>
                              <th className="p-3">PIN Code</th>
                              <th className="p-3">Contact</th>
                              <th className="p-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {addressesList.length > 0 ? (
                              addressesList.map((addr, idx) => (
                                <tr 
                                  key={addr.id} 
                                  onClick={() => handleSelectAddressRow(addr)}
                                  className={`cursor-pointer transition-colors ${
                                    selectedAddressId === addr.id ? 'bg-primary-50/70 font-semibold' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <td className="p-3 text-center font-bold text-gray-500">{idx + 1}</td>
                                  <td className="p-3 font-bold text-gray-900">{addr.type}</td>
                                  <td className="p-3 text-gray-700 truncate max-w-[200px]" title={addr.address}>{addr.address}</td>
                                  <td className="p-3 text-gray-700">{addr.city ? `${addr.city}${addr.state ? `, ${addr.state}` : ''}` : (addr.state || '-')}</td>
                                  <td className="p-3 text-gray-700">{addr.country || 'India'}</td>
                                  <td className="p-3 font-mono font-bold text-gray-700">{addr.pinCode || '-'}</td>
                                  <td className="p-3 text-gray-700">{addr.phoneNo || addr.email || '-'}</td>
                                  <td className="p-3 text-right">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectAddressRow(addr);
                                      }}
                                      className="p-1 text-primary-600 hover:text-primary-800 font-bold text-xs"
                                    >
                                      Edit
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={8} className="p-8 text-center text-gray-400 font-medium">
                                  <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                  <span>No Addresses Added Yet. Fill form below to add one.</span>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Address Form Box */}
                      <div className="border border-gray-200 rounded-2xl p-6 bg-white space-y-6 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-gray-200/80 pb-3">
                          <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary-600" />
                            {selectedAddressId ? `Edit Address (${addressForm.type || 'Selected'})` : 'New Address Details'}
                          </h4>
                          {selectedAddressId && (
                            <span className="text-[11px] font-bold text-primary-700 bg-primary-100 px-2.5 py-0.5 rounded-full">
                              Editing Selected Row
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* 1. Address Type */}
                          <FormControl fullWidth size="small" sx={muiAddressFieldSx}>
                            <InputLabel id="customer-address-type-label" shrink>Address Type</InputLabel>
                            <Select
                              labelId="customer-address-type-label"
                              id="customer-address-type-select"
                              value={addressForm.type || 'Registered Office'}
                              label="Address Type"
                              notched
                              onChange={(e) => setAddressForm({ ...addressForm, type: e.target.value })}
                            >
                              <MenuItem value="Registered Office">Registered Office</MenuItem>
                              <MenuItem value="Works / Factory Address">Works / Factory Address</MenuItem>
                              <MenuItem value="Billing Address">Billing Address</MenuItem>
                              <MenuItem value="Delivery Address">Delivery Address</MenuItem>
                              <MenuItem value="Warehouse Address">Warehouse Address</MenuItem>
                            </Select>
                          </FormControl>

                          {/* 2. Country */}
                          <TextFieldComponent
                            label="Country"
                            value={addressForm.country || 'India'}
                            onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                            placeholder="e.g. India"
                          />

                          {/* 3. Street Address (full width) */}
                          <div className="md:col-span-2">
                            <TextFieldComponent
                              label="Street Address *"
                              value={addressForm.address || ''}
                              onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                              placeholder="Plot No., Building, Street Name, Industrial Area..."
                            />
                          </div>

                          {/* 4. City */}
                          <TextFieldComponent
                            label="City *"
                            value={addressForm.city || ''}
                            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                            placeholder="e.g. Surat"
                          />

                          {/* 5. State */}
                          <TextFieldComponent
                            label="State"
                            value={addressForm.state || ''}
                            onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                            placeholder="e.g. Gujarat"
                          />

                          {/* 6. PIN Code */}
                          <TextFieldComponent
                            label="PIN Code"
                            value={addressForm.pinCode || ''}
                            onChange={(e) => setAddressForm({ ...addressForm, pinCode: e.target.value })}
                            placeholder="e.g. 395004"
                          />

                          {/* 7. Phone No. */}
                          <TextFieldComponent
                            label="Phone No."
                            value={addressForm.phoneNo || ''}
                            onChange={(e) => setAddressForm({ ...addressForm, phoneNo: e.target.value })}
                            placeholder="e.g. +91 98251 23456"
                          />

                          {/* 8. E-mail ID */}
                          <TextFieldComponent
                            label="E-mail ID"
                            type="email"
                            value={addressForm.email || ''}
                            onChange={(e) => setAddressForm({ ...addressForm, email: e.target.value })}
                            placeholder="e.g. office@company.com"
                          />
                        </div>

                        {/* STERP Style Action Buttons */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                          <div>
                            {selectedAddressId && (
                              <button
                                type="button"
                                onClick={handleDeleteAddress}
                                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                <span>Delete Address</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={handleClearAddressForm}
                              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                            >
                              Cancel / Clear
                            </button>

                            <button
                              type="button"
                              disabled={isSavingAddress}
                              onClick={handleSaveAddress}
                              className="px-5 py-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white text-xs font-bold rounded-xl shadow-md shadow-primary-600/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {isSavingAddress ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Saving...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{selectedAddressId ? 'Update Address' : 'Add Address'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Primary Contact Person */}
                    <div className="border-t border-gray-200 pt-6 space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Primary Contact Person</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <TextFieldComponent name="contactPersonName" label="Contact Person Name" placeholder="e.g. Nayan Vegad" />
                        
                        <TextFieldComponent 
                          name="contact" 
                          label="Contact Phone" 
                          placeholder="98765 43210" 
                          slotProps={{
                            input: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <span className="flex items-center gap-1 select-none text-xs font-bold text-gray-700 pr-1">
                                    <span>🇮🇳</span>
                                    <span>+91</span>
                                  </span>
                                </InputAdornment>
                              )
                            }
                          }}
                        />

                        <div className="md:col-span-2">
                          <TextFieldComponent name="email" label="Email Address" placeholder="info@client.com" />
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* TAB 4: TAX */}
                {activeTab === 'tax' && (
                  <div className="p-6 sm:p-8 space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Tax & Registration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <TextFieldComponent name="taxId" label="Tax ID / GSTIN" placeholder="Enter GSTIN" />
                      <TextFieldComponent name="vrnNo" label="VRN / State Registration" placeholder="Enter VRN Number" />
                      <TextFieldComponent name="taxCategory" label="Tax Category" placeholder="Enter Tax Category" />
                    </div>
                  </div>
                )}

                {/* TAB 5: ACCOUNTING - COMMENTED OUT
                {activeTab === 'accounting' && (
                  <div className="p-6 sm:p-8 space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Accounting Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <TextFieldComponent name="receivableAccount" label="Receivable Account" placeholder="Debtors - PS" />
                      
                      <SelectOutlinedField
                        name="paymentTerms"
                        label="Payment Terms"
                        options={[
                          { value: 'Net 30', label: 'Net 30 Days' },
                          { value: 'Net 60', label: 'Net 60 Days' },
                          { value: 'Immediate', label: 'Immediate / Cash on Delivery' }
                        ]}
                      />

                      <TextFieldComponent name="creditLimit" label="Credit Limit (INR ₹)" type="number" placeholder="5000000" />

                      <div className="flex items-center pt-4">
                        <label className="flex items-center gap-2.5 text-xs font-bold text-gray-800 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={values.trackExchangeDifferences} 
                            onChange={(e) => setFieldValue('trackExchangeDifferences', e.target.checked)}
                            className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                          />
                          <span>Track Exchange Differences</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
                */}

                {/* TAB 6: SALES TEAM */}
                {activeTab === 'sales' && (
                  <div className="p-6 sm:p-8 space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Sales Team & Commission</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <TextFieldComponent name="salesPerson" label="Sales Person" placeholder="Sales rep name" />
                      <TextFieldComponent name="contributionPercent" label="Contribution (%)" type="number" placeholder="100" />
                    </div>
                  </div>
                )}

                {/* TAB 7: SETTINGS */}
                {activeTab === 'settings' && (
                  <div className="p-6 sm:p-8 space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Customer Settings</h3>
                    <div className="space-y-4">
                      <label className="flex items-center gap-2.5 text-xs font-bold text-gray-800 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={values.allowSoWithoutSopp} 
                          onChange={(e) => setFieldValue('allowSoWithoutSopp', e.target.checked)}
                          className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                        />
                        <span>Allow Sales Order Creation Without Sales Opportunity</span>
                      </label>

                      <label className="flex items-center gap-2.5 text-xs font-bold text-gray-800 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={values.disabled} 
                          onChange={(e) => setFieldValue('disabled', e.target.checked)}
                          className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                        />
                        <span>Disabled</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* TAB 8: PORTAL USERS - COMMENTED OUT
                {activeTab === 'portal' && (
                  <div className="p-6 sm:p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Customer Portal Access</h3>
                      <button
                        type="button"
                        onClick={() => successToast('Portal invitation sent')}
                        className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                      >
                        + Add Portal User
                      </button>
                    </div>
                    <div className="border border-gray-200 rounded-2xl p-6 text-center text-gray-400 text-xs font-medium">
                      No portal users configured for this customer.
                    </div>
                  </div>
                )}
                */}

              </div>

            </div>

            {/* COMMENTS & ACTIVITY TIMELINE COMPONENT BELOW ALL CARDS */}
            {/* <FormCommentsAndActivity
              entityType="Customer"
              entityId={id || initialValues.id || ''}
              createdByName={(initialValues as any).createdBy || user?.name || user?.username || 'Admin'}
              createdAt={(initialValues as any).createdAt ? formatDistanceToNow(new Date((initialValues as any).createdAt), { addSuffix: true }) : 'recently'}
              lastEditedByName={(initialValues as any).updatedBy || user?.name || user?.username || 'Admin'}
              lastEditedAt={(initialValues as any).updatedAt ? formatDistanceToNow(new Date((initialValues as any).updatedAt), { addSuffix: true }) : 'recently'}
              currentUser={{ name: user?.name || user?.username || 'Admin' }}
              className="mt-6"
            /> */}

          </Form>
        </ERPFormPageLayout>
      )}
    </Formik>
  );
};

export const CustomerFormPage = WithAuth(CustomerFormPageBase);
export default CustomerFormPage;

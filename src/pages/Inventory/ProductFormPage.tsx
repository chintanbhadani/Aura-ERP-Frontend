import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { FormPageLayout } from '../../layouts/FormPageLayout';
import { fetchInventoryById, fetchCategories, fetchSuppliers, fetchUnits, fetchSkus, createCategory, createSupplier, createUnit, createSku, createProduct, updateProduct, type Product, type Category, type Supplier, type Unit, type SkuMaster } from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { TextFieldComponent, SelectOutlinedField, ReusableAutocomplete } from '../../components/input/index';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import { Plus } from 'lucide-react';

const materialValidationSchema = Yup.object({
  name: Yup.string().trim().required('Material name is required'),
  sku: Yup.string().trim().required('SKU is required'),
  categoryId: Yup.string().required('Category is required'),
  supplierId: Yup.string().required('Supplier is required'),
  invoiceDate: Yup.string().required('Invoice date & time is required'),
  quantity: Yup.number()
    .typeError('Quantity must be a valid number')
    .min(0, 'Quantity cannot be negative')
    .required('Quantity is required'),
  unitId: Yup.string().required('Quantity unit is required'),
  minStock: Yup.number()
    .typeError('Min stock alert must be a valid number')
    .min(0, 'Min stock alert cannot be negative')
    .required('Min stock alert is required'),
  costPrice: Yup.number()
    .typeError('Price per unit must be a valid number')
    .min(0, 'Price per unit cannot be negative')
    .required('Price per unit is required'),
  sellingPrice: Yup.number()
    .typeError('Selling price must be a valid number')
    .min(0, 'Selling price cannot be negative')
    .required('Selling price is required'),
});

const categoryModalValidationSchema = Yup.object({ name: Yup.string().trim().required('Category name is required') });
const supplierValidationSchema = Yup.object({ name: Yup.string().trim().required('Supplier name is required'), contact: Yup.string().trim().required('Contact number is required'), email: Yup.string().trim().email('Must be a valid email').required('Email address is required') });
const unitValidationSchema = Yup.object({ name: Yup.string().trim().required('Required') });
const skuModalValidationSchema = Yup.object({
  name: Yup.string().trim().required('Material name is required'),
  sku: Yup.string().trim().required('SKU code is required'),
});

const formatDateTimeLocal = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const ProductFormPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(isEditMode);

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [skus, setSkus] = useState<SkuMaster[]>([]);

  const [showUnitModal, setShowUnitModal] = useState(false);

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [pendingSupplierName, setPendingSupplierName] = useState('');
  const supplierResolveRef = useRef<((supplier: any) => void) | null>(null);

  const [showSkuModal, setShowSkuModal] = useState(false);
  const [pendingSkuName, setPendingSkuName] = useState('');
  const skuResolveRef = useRef<((sku: any) => void) | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pendingCategoryName, setPendingCategoryName] = useState('');
  const categoryResolveRef = useRef<((cat: any) => void) | null>(null);

  const formikRef = useRef<any>(null);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
    fetchSuppliers().then(setSuppliers).catch(console.error);
    fetchUnits().then(setUnits).catch(console.error);
    fetchSkus().then(setSkus).catch(console.error);

    if (isEditMode && id) {
      fetchInventoryById(id).then(product => {
        setInitialData(product);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [id, isEditMode]);

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      setSubmitting(true);
      const payload = {
        id: initialData?.id,
        sku: values.sku.trim(),
        name: values.name.trim(),
        quantity: Number(values.quantity),
        cost_price: Number(values.costPrice),
        selling_price: Number(values.sellingPrice),
        min_stock: Number(values.minStock),
        categoryId: values.categoryId,
        supplierId: values.supplierId,
        invoiceDate: values.invoiceDate,
        unitId: values.unitId,
        location: initialData?.location || '',
        status: initialData?.status || 'Active'
      };

      if (isEditMode && id) {
        await updateProduct(id, payload);
        successToast('Material updated successfully');
      } else {
        await createProduct(payload);
        successToast('Material created successfully');
      }
      navigate('/inventory');
    } catch (error: any) {
      console.error('Error saving product', error);
      errorToast(error?.response?.data?.error || 'Failed to save product. Check if SKU is unique.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <Formik
      innerRef={formikRef}
      initialValues={{
        sku: initialData?.sku || `MAT-${Math.floor(Math.random() * 10000)}`,
        name: initialData?.name || '',
        quantity: initialData?.quantity !== undefined ? String(initialData.quantity) : '',
        costPrice: initialData?.cost_price !== undefined ? String(initialData.cost_price) : '',
        sellingPrice: initialData?.selling_price !== undefined ? String(initialData.selling_price) : '',
        minStock: initialData?.min_stock !== undefined ? String(initialData.min_stock) : '50',
        categoryId: initialData?.categoryId || '',
        supplierId: initialData?.supplierId || '',
        invoiceDate: formatDateTimeLocal(initialData?.invoiceDate),
        unitId: initialData?.unitId || '',
      }}
      enableReinitialize
      validationSchema={materialValidationSchema}
      onSubmit={handleSubmit}
    >
      {({ values, submitForm, isSubmitting, setFieldValue }) => (
        <FormPageLayout
          title={isEditMode ? 'Edit Stock' : 'Add Stock'}
          metadata={isEditMode ? {
            createdBy: 'Admin', // Dummy metadata for now
            createdAt: '2 days ago',
            lastEditedBy: 'Current User',
            lastEditedAt: 'Just now'
          } : undefined}
          onSave={submitForm}
          onCancel={() => navigate('/inventory')}
          isSubmitting={isSubmitting}
        >
          <Form noValidate className="max-w-3xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 relative">
                <ReusableAutocomplete
                  keyName="name"
                  compareKey="name"
                  label="Material Name"
                  placeholder="Search or add SKU..."
                  options={skus}
                  getOptionLabel={(sku) => sku ? `${sku.name} (${sku.sku})` : ''}
                  creatable
                  onChange={(selectedSku: any) => {
                    if (selectedSku) {
                      if (selectedSku.sku) setFieldValue('sku', selectedSku.sku);
                      if (selectedSku.categoryId) setFieldValue('categoryId', selectedSku.categoryId);
                    }
                  }}
                  onCreate={(newSkuName) => {
                    return new Promise((resolve) => {
                      setPendingSkuName(newSkuName);
                      skuResolveRef.current = resolve;
                      setShowSkuModal(true);
                    });
                  }}
                />
              </div>
              <div className="md:col-span-1">
                <TextFieldComponent name="sku" label="SKU (Auto-Generated)" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ReusableAutocomplete
                keyName="categoryId"
                label="Category Type"
                placeholder="Search or add..."
                options={categories}
                getOptionLabel={(cat) => cat?.name || ''}
                creatable
                onCreate={(newCategoryName) => {
                  return new Promise((resolve) => {
                    setPendingCategoryName(newCategoryName);
                    categoryResolveRef.current = resolve;
                    setShowCategoryModal(true);
                  });
                }}
              />
              <ReusableAutocomplete
                keyName="supplierId"
                label="Supplier"
                placeholder="Search or add..."
                options={suppliers}
                getOptionLabel={(sup) => sup?.name || ''}
                creatable
                onCreate={(newSupplierName) => {
                  return new Promise((resolve) => {
                    setPendingSupplierName(newSupplierName);
                    supplierResolveRef.current = resolve;
                    setShowSupplierModal(true);
                  });
                }}
              />
              <TextFieldComponent 
                name="invoiceDate" 
                label="Invoice Date & Time" 
                type="datetime-local" 
                InputLabelProps={{ shrink: true }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TextFieldComponent name="quantity" label="Quantity" type="number" placeholder="e.g. 500" />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <SelectOutlinedField
                    name="unitId"
                    label="Quantity Unit"
                    options={units.map(u => ({ label: u.name, value: u.id }))}
                  />
                </Box>
                <Tooltip title="Add new unit">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => setShowUnitModal(true)}
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', width: '40px', height: '40px' }}
                  >
                    <Plus size={18} />
                  </IconButton>
                </Tooltip>
              </Box>
              <TextFieldComponent name="minStock" label="Min Stock Alert" type="number" placeholder="e.g. 50" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TextFieldComponent name="costPrice" label="Price per unit ($)" type="number" placeholder="e.g. 12.50" />
              <TextFieldComponent 
                name="total" 
                label="Total ($)" 
                disabled
                value={(Number(values.quantity || 0) * Number(values.costPrice || 0)).toFixed(2)}
                inputProps={{ readOnly: true, tabIndex: -1 }}
                sx={{ bgcolor: '#f9fafb' }}
              />
              <TextFieldComponent name="sellingPrice" label="Selling Price ($)" type="number" placeholder="e.g. 25.00" />
            </div>
          </Form>

          {/* Unit Modal */}
          {showUnitModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-[60]">
              <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl relative">
                <h3 className="text-lg font-bold text-gray-900 mb-5">Add New Unit</h3>
                <Formik
                  initialValues={{ name: '' }}
                  validationSchema={unitValidationSchema}
                  onSubmit={async (val, { resetForm, setSubmitting }) => {
                    try {
                      setSubmitting(true);
                      const newUnit = await createUnit({ name: val.name.trim() });
                      setUnits((prev) => [...prev, newUnit]);
                      formikRef.current?.setFieldValue('unitId', newUnit.id);
                      setShowUnitModal(false);
                      resetForm();
                      successToast('Unit created');
                    } catch (error) {
                      errorToast('Failed to create unit');
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  {({ isSubmitting, submitForm }) => (
                    <Form noValidate>
                      <TextFieldComponent name="name" label="Unit Name" placeholder="e.g. kg, pcs" autoFocus />
                      <div className="flex justify-end gap-3 pt-6 mt-4">
                        <Button type="button" variant="text" color="inherit" onClick={() => setShowUnitModal(false)}>Cancel</Button>
                        <Button type="button" variant="contained" color="primary" disabled={isSubmitting} onClick={submitForm}>
                          {isSubmitting ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </Form>
                  )}
                </Formik>
              </div>
            </div>
          )}

          {/* Add Supplier Modal */}
          {showSupplierModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-[60]">
              <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl relative">
                <h3 className="text-lg font-bold text-gray-900 mb-5">Add New Supplier</h3>
                <Formik
                  initialValues={{ name: pendingSupplierName, contact: '', email: '' }}
                  validationSchema={supplierValidationSchema}
                  onSubmit={async (val, { setSubmitting }) => {
                    try {
                      setSubmitting(true);
                      const newSup = await createSupplier({
                        name: val.name.trim(),
                        contact: val.contact.trim(),
                        email: val.email.trim(),
                      });
                      setSuppliers((prev) => [...prev, newSup]);
                      supplierResolveRef.current?.(newSup);
                      supplierResolveRef.current = null;
                      setShowSupplierModal(false);
                      successToast(`Supplier "${newSup.name}" created successfully`);
                    } catch (error: any) {
                      errorToast('Failed to create supplier');
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  {({ isSubmitting, submitForm }) => (
                    <Form noValidate>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <TextFieldComponent name="name" label="Supplier Name" placeholder="e.g. ABC Enterprises" autoFocus />
                        <TextFieldComponent name="contact" label="Contact Number" placeholder="e.g. 9876543210" />
                        <TextFieldComponent name="email" label="Email Address" type="email" placeholder="e.g. info@supplier.com" />
                      </Box>
                      <div className="flex justify-end gap-3 pt-6 mt-4">
                        <Button
                          type="button"
                          variant="text"
                          color="inherit"
                          onClick={() => {
                            supplierResolveRef.current?.(undefined);
                            supplierResolveRef.current = null;
                            setShowSupplierModal(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="button" variant="contained" color="primary" disabled={isSubmitting} onClick={submitForm}>
                          {isSubmitting ? 'Saving...' : 'Save Supplier'}
                        </Button>
                      </div>
                    </Form>
                  )}
                </Formik>
              </div>
            </div>
          )}

          {/* Add New SKU (Material) Modal */}
          {showSkuModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-[60]">
              <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl relative">
                <h3 className="text-lg font-bold text-gray-900 mb-5">Add New Material</h3>
                <Formik
                  initialValues={{ name: pendingSkuName, sku: `MAT-${Math.floor(Math.random() * 10000)}` }}
                  validationSchema={skuModalValidationSchema}
                  onSubmit={async (val, { setSubmitting }) => {
                    try {
                      setSubmitting(true);
                      const newSku = await createSku({ name: val.name.trim(), sku: val.sku.trim() });
                      setSkus((prev) => [...prev, newSku]);
                      skuResolveRef.current?.(newSku);
                      skuResolveRef.current = null;
                      setShowSkuModal(false);
                      successToast(`Material "${newSku.name}" created successfully`);
                    } catch (error: any) {
                      errorToast('Failed to create material');
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  {({ isSubmitting, submitForm }) => (
                    <Form noValidate>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <TextFieldComponent name="name" label="Material Name" placeholder="e.g. Engine Oil" autoFocus />
                        <TextFieldComponent name="sku" label="SKU Code" placeholder="e.g. MAT-1001" />
                      </Box>
                      <div className="flex justify-end gap-3 pt-6 mt-4">
                        <Button
                          type="button"
                          variant="text"
                          color="inherit"
                          onClick={() => {
                            skuResolveRef.current?.(undefined);
                            skuResolveRef.current = null;
                            setShowSkuModal(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="button" variant="contained" color="primary" disabled={isSubmitting} onClick={submitForm}>
                          {isSubmitting ? 'Saving...' : 'Save Material'}
                        </Button>
                      </div>
                    </Form>
                  )}
                </Formik>
              </div>
            </div>
          )}

          {/* Add New Category Modal */}
          {showCategoryModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-[60]">
              <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl relative">
                <h3 className="text-lg font-bold text-gray-900 mb-5">Add New Category</h3>
                <Formik
                  initialValues={{ name: pendingCategoryName }}
                  validationSchema={categoryModalValidationSchema}
                  onSubmit={async (val, { setSubmitting }) => {
                    try {
                      setSubmitting(true);
                      const newCat = await createCategory({ name: val.name.trim() });
                      setCategories((prev) => [...prev, newCat]);
                      categoryResolveRef.current?.(newCat);
                      categoryResolveRef.current = null;
                      setShowCategoryModal(false);
                      successToast(`Category "${newCat.name}" created successfully`);
                    } catch (error: any) {
                      errorToast('Failed to create category');
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  {({ isSubmitting, submitForm }) => (
                    <Form noValidate>
                      <TextFieldComponent name="name" label="Category Name" placeholder="e.g. Engine Parts" autoFocus />
                      <div className="flex justify-end gap-3 pt-6 mt-4">
                        <Button
                          type="button"
                          variant="text"
                          color="inherit"
                          onClick={() => {
                            categoryResolveRef.current?.(undefined);
                            categoryResolveRef.current = null;
                            setShowCategoryModal(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="button" variant="contained" color="primary" disabled={isSubmitting} onClick={submitForm}>
                          {isSubmitting ? 'Saving...' : 'Save Category'}
                        </Button>
                      </div>
                    </Form>
                  )}
                </Formik>
              </div>
            </div>
          )}
        </FormPageLayout>
      )}
    </Formik>
  );
};

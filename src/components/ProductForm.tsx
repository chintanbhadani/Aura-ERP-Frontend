import React, { useState, useEffect, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import type { Product, Category, Supplier, Unit } from '../services/api';
import { fetchCategories, fetchSuppliers, fetchUnits, createCategory, createSupplier, createUnit } from '../services/api';
import { successToast, errorToast } from '../helper/toast';
import { TextFieldComponent, SelectOutlinedField } from './input/index';

interface ProductFormProps {
  initialData?: Product | null;
  products?: Product[];
  onSubmit: (data: Product) => void;
  onCancel: () => void;
}

const materialValidationSchema = Yup.object({
  name: Yup.string().trim().required('Material name is required'),
  sku: Yup.string().trim().required('SKU is required'),
  categoryId: Yup.string().required('Category is required'),
  supplierId: Yup.string().required('Supplier is required'),
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

const categoryValidationSchema = Yup.object({
  name: Yup.string().trim().required('Category name is required'),
});

const supplierValidationSchema = Yup.object({
  name: Yup.string().trim().required('Supplier name is required'),
  contact: Yup.string().trim(),
  email: Yup.string().email('Must be a valid email address').trim(),
});

const unitValidationSchema = Yup.object({
  name: Yup.string().trim().required('Unit name is required'),
});

export const ProductForm: React.FC<ProductFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  // References for Formik submit & field setters across modals
  const mainSubmitRef = useRef<() => Promise<any>>(null as any);
  const mainSetFieldValueRef = useRef<(field: string, value: any) => void>(null as any);

  const categorySubmitRef = useRef<() => Promise<any>>(null as any);
  const supplierSubmitRef = useRef<() => Promise<any>>(null as any);
  const unitSubmitRef = useRef<() => Promise<any>>(null as any);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
    fetchSuppliers().then(setSuppliers).catch(console.error);
    fetchUnits().then(setUnits).catch(console.error);
  }, []);

  // Keyboard shortcut: Ctrl + S / Cmd + S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (showCategoryModal) {
          categorySubmitRef.current?.();
        } else if (showSupplierModal) {
          supplierSubmitRef.current?.();
        } else if (showUnitModal) {
          unitSubmitRef.current?.();
        } else {
          mainSubmitRef.current?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCategoryModal, showSupplierModal, showUnitModal]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl p-8 w-full max-w-3xl shadow-xl relative my-8">
        <button 
          onClick={onCancel}
          className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          {initialData ? "Edit Material" : "Create New Material"}
        </h2>
        
        <Formik
          initialValues={{
            sku: initialData?.sku || `MAT-${Math.floor(Math.random() * 10000)}`,
            name: initialData?.name || '',
            quantity: initialData?.quantity !== undefined ? String(initialData.quantity) : '',
            costPrice: initialData?.cost_price !== undefined ? String(initialData.cost_price) : '',
            sellingPrice: initialData?.selling_price !== undefined ? String(initialData.selling_price) : '',
            minStock: initialData?.min_stock !== undefined ? String(initialData.min_stock) : '50',
            categoryId: initialData?.categoryId || '',
            supplierId: initialData?.supplierId || '',
            unitId: initialData?.unitId || '',
          }}
          enableReinitialize
          validationSchema={materialValidationSchema}
          onSubmit={(values) => {
            onSubmit({
              id: initialData?.id,
              sku: values.sku.trim(),
              name: values.name.trim(),
              quantity: Number(values.quantity),
              cost_price: Number(values.costPrice),
              selling_price: Number(values.sellingPrice),
              min_stock: Number(values.minStock),
              categoryId: values.categoryId,
              supplierId: values.supplierId,
              unitId: values.unitId,
              location: initialData?.location || '',
              status: initialData?.status || 'Active'
            });
          }}
        >
          {({ values, submitForm, setFieldValue }) => {
            mainSubmitRef.current = submitForm;
            mainSetFieldValueRef.current = setFieldValue;

            return (
              <Form noValidate className="space-y-6">
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2">
                    <TextFieldComponent 
                      name="name" 
                      label="Material Name" 
                      placeholder="e.g. Copper Wire 1mm" 
                    />
                  </div>
                  <div className="col-span-1">
                    <TextFieldComponent 
                      name="sku" 
                      label="SKU (Auto-Generated)" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', width: '100%' }}>
                    <Box sx={{ flex: 1 }}>
                      <SelectOutlinedField
                        name="categoryId"
                        label="Category Type"
                        options={categories.map(c => ({ label: c.name, value: c.id }))}
                      />
                    </Box>
                    <Tooltip title="Add new category">
                      <IconButton
                        size="small"
                        color="primary"
                        tabIndex={-1}
                        onClick={() => setShowCategoryModal(true)}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: '12px',
                          width: '40px',
                          height: '40px',
                          flexShrink: 0,
                          '&:hover': {
                            backgroundColor: 'action.hover',
                            borderColor: 'primary.main'
                          }
                        }}
                      >
                        <Plus size={18} />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', width: '100%' }}>
                    <Box sx={{ flex: 1 }}>
                      <SelectOutlinedField
                        name="supplierId"
                        label="Supplier"
                        options={suppliers.map(s => ({ label: s.name, value: s.id }))}
                      />
                    </Box>
                    <Tooltip title="Add new supplier">
                      <IconButton
                        size="small"
                        color="primary"
                        tabIndex={-1}
                        onClick={() => setShowSupplierModal(true)}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: '12px',
                          width: '40px',
                          height: '40px',
                          flexShrink: 0,
                          '&:hover': {
                            backgroundColor: 'action.hover',
                            borderColor: 'primary.main'
                          }
                        }}
                      >
                        <Plus size={18} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <TextFieldComponent 
                      name="quantity" 
                      label="Quantity" 
                      type="number" 
                      placeholder="e.g. 500" 
                    />
                  </div>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', width: '100%' }}>
                    <Box sx={{ flex: 1 }}>
                      <SelectOutlinedField
                        name="unitId"
                        label="Quantity unit"
                        options={units.map(u => ({ label: u.name, value: u.id }))}
                      />
                    </Box>
                    <Tooltip title="Add new unit">
                      <IconButton
                        size="small"
                        color="primary"
                        tabIndex={-1}
                        onClick={() => setShowUnitModal(true)}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: '12px',
                          width: '40px',
                          height: '40px',
                          flexShrink: 0,
                          '&:hover': {
                            backgroundColor: 'action.hover',
                            borderColor: 'primary.main'
                          }
                        }}
                      >
                        <Plus size={18} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <div>
                    <TextFieldComponent 
                      name="minStock" 
                      label="Min Stock Alert" 
                      type="number" 
                      placeholder="e.g. 50" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <TextFieldComponent 
                      name="costPrice" 
                      label="Price per unit ($)" 
                      type="number" 
                      placeholder="e.g. 12.50" 
                    />
                  </div>
                  <div>
                    <TextFieldComponent 
                      name="total" 
                      label="Total ($)" 
                      disabled
                      value={(Number(values.quantity || 0) * Number(values.costPrice || 0)).toFixed(2)}
                      inputProps={{ readOnly: true, tabIndex: -1 }}
                      sx={{ bgcolor: '#f9fafb' }}
                    />
                  </div>
                  <div>
                    <TextFieldComponent 
                      name="sellingPrice" 
                      label="Selling Price ($)" 
                      type="number" 
                      placeholder="e.g. 25.00" 
                    />
                  </div>
                </div>

                <div className="flex justify-end items-center gap-4 mt-10 pt-2">
                  <Button 
                    type="button" 
                    variant="text" 
                    color="primary"
                    onClick={onCancel} 
                    sx={{ px: 3.5, py: 1.2, fontWeight: 600, fontSize: '0.95rem' }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary"
                    sx={{ px: 4.5, py: 1.2, fontWeight: 600, fontSize: '0.95rem' }}
                  >
                    Save Details
                  </Button>
                </div>
              </Form>
            );
          }}
        </Formik>
      </div>

      {/* Category Sub-modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl relative">
            <h3 className="text-lg font-bold text-gray-900 mb-5">Add New Category</h3>
            <Formik
              initialValues={{ name: '' }}
              validationSchema={categoryValidationSchema}
              onSubmit={async (values, { resetForm, setSubmitting }) => {
                try {
                  setSubmitting(true);
                  const newCat = await createCategory({ name: values.name.trim() });
                  setCategories((prev) => [...prev, newCat]);
                  mainSetFieldValueRef.current?.('categoryId', newCat.id);
                  setShowCategoryModal(false);
                  resetForm();
                  successToast('Category created successfully');
                } catch (error: any) {
                  console.error('Error creating category:', error);
                  errorToast(error?.response?.data?.error || 'Failed to create category');
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {({ isSubmitting, submitForm }) => {
                categorySubmitRef.current = submitForm;

                return (
                  <Form noValidate>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <TextFieldComponent 
                        name="name" 
                        label="Category Name" 
                        placeholder="e.g. Electronics" 
                        autoFocus 
                      />
                    </Box>
                    <div className="flex justify-end gap-3 pt-6">
                      <Button 
                        type="button" 
                        variant="text"
                        color="inherit"
                        onClick={() => setShowCategoryModal(false)} 
                        sx={{ px: 2.5, py: 1, color: 'text.secondary', fontWeight: 600 }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        variant="contained" 
                        color="primary"
                        disabled={isSubmitting} 
                        sx={{ px: 3.5, py: 1, fontWeight: 600 }}
                      >
                        {isSubmitting ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </Form>
                );
              }}
            </Formik>
          </div>
        </div>
      )}

      {/* Supplier Sub-modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl relative">
            <h3 className="text-lg font-bold text-gray-900 mb-5">Add New Supplier</h3>
            <Formik
              initialValues={{ name: '', contact: '', email: '' }}
              validationSchema={supplierValidationSchema}
              onSubmit={async (values, { resetForm, setSubmitting }) => {
                try {
                  setSubmitting(true);
                  const newSup = await createSupplier({
                    name: values.name.trim(),
                    contact: values.contact.trim(),
                    email: values.email.trim(),
                  });
                  setSuppliers((prev) => [...prev, newSup]);
                  mainSetFieldValueRef.current?.('supplierId', newSup.id);
                  setShowSupplierModal(false);
                  resetForm();
                  successToast('Supplier created successfully');
                } catch (error: any) {
                  console.error('Error creating supplier:', error);
                  errorToast(error?.response?.data?.error || 'Failed to create supplier');
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {({ isSubmitting, submitForm }) => {
                supplierSubmitRef.current = submitForm;

                return (
                  <Form noValidate>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <TextFieldComponent 
                        name="name" 
                        label="Supplier Name" 
                        placeholder="e.g. Acme Supplies" 
                        autoFocus 
                      />
                      <TextFieldComponent 
                        name="contact" 
                        label="Contact" 
                        placeholder="e.g. +1 555-0199" 
                      />
                      <TextFieldComponent 
                        name="email" 
                        label="Email" 
                        type="email" 
                        placeholder="e.g. supplier@example.com" 
                      />
                    </Box>
                    <div className="flex justify-end gap-3 pt-6">
                      <Button 
                        type="button" 
                        variant="text"
                        color="inherit"
                        onClick={() => setShowSupplierModal(false)} 
                        sx={{ px: 2.5, py: 1, color: 'text.secondary', fontWeight: 600 }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        variant="contained" 
                        color="primary"
                        disabled={isSubmitting} 
                        sx={{ px: 3.5, py: 1, fontWeight: 600 }}
                      >
                        {isSubmitting ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </Form>
                );
              }}
            </Formik>
          </div>
        </div>
      )}

      {/* Unit Sub-modal */}
      {showUnitModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl relative">
            <h3 className="text-lg font-bold text-gray-900 mb-5">Add New Unit</h3>
            <Formik
              initialValues={{ name: '' }}
              validationSchema={unitValidationSchema}
              onSubmit={async (values, { resetForm, setSubmitting }) => {
                try {
                  setSubmitting(true);
                  const newUnit = await createUnit({ name: values.name.trim() });
                  setUnits((prev) => [...prev, newUnit]);
                  mainSetFieldValueRef.current?.('unitId', newUnit.id);
                  setShowUnitModal(false);
                  resetForm();
                  successToast('Unit created successfully');
                } catch (error: any) {
                  console.error('Error creating unit:', error);
                  errorToast(error?.response?.data?.error || 'Failed to create unit');
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {({ isSubmitting, submitForm }) => {
                unitSubmitRef.current = submitForm;

                return (
                  <Form noValidate>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <TextFieldComponent 
                        name="name" 
                        label="Unit Name" 
                        placeholder="e.g. kg, pcs, boxes" 
                        autoFocus 
                      />
                    </Box>
                    <div className="flex justify-end gap-3 pt-6">
                      <Button 
                        type="button" 
                        variant="text"
                        color="inherit"
                        onClick={() => setShowUnitModal(false)} 
                        sx={{ px: 2.5, py: 1, color: 'text.secondary', fontWeight: 600 }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        variant="contained" 
                        color="primary"
                        disabled={isSubmitting} 
                        sx={{ px: 3.5, py: 1, fontWeight: 600 }}
                      >
                        {isSubmitting ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </Form>
                );
              }}
            </Formik>
          </div>
        </div>
      )}
    </div>
  );
};

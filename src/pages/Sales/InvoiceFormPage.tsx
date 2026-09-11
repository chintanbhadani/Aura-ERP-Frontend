import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Formik, Form, FieldArray } from 'formik';
import * as Yup from 'yup';
import { FormPageLayout } from '../../layouts/FormPageLayout';
import { fetchProducts, fetchCustomers, fetchSuppliers, fetchCategories, createInvoice, createCustomer, createSupplier, createProduct, createCategory } from '../../services/api';
import type { Product, Customer, Supplier, Category } from '../../types';
import { successToast, errorToast } from '../../helper/toast';
import { TextFieldComponent, SelectOutlinedField, DatePickerComponent, ReusableAutocomplete } from '../../components/input/index';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { useCurrency } from '../../helper/currency';

const invoiceValidationSchema = Yup.object({
  type: Yup.string().required(),
  date: Yup.string().required('Date is required'),
  customerId: Yup.string().when('type', {
    is: 'SALES',
    then: (schema) => schema.required('Customer is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  supplierId: Yup.string().when('type', {
    is: 'PURCHASE',
    then: (schema) => schema.required('Supplier is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  paymentType: Yup.string().required(),
  cashAmount: Yup.number().when('paymentType', {
    is: 'PARTIAL',
    then: (schema) => schema.min(0).required('Required for partial'),
    otherwise: (schema) => schema.notRequired(),
  }),
  bankAmount: Yup.number().when('paymentType', {
    is: 'PARTIAL',
    then: (schema) => schema.min(0).required('Required for partial'),
    otherwise: (schema) => schema.notRequired(),
  }),
  items: Yup.array().of(
    Yup.object({
      productId: Yup.string().required('Product is required'),
      quantity: Yup.number().typeError('Must be a number').min(1, 'Min 1').required('Required'),
      unitPrice: Yup.number().typeError('Must be a number').min(0, 'Min 0').required('Required'),
    })
  ).min(1, 'Please add at least one item')
});

const customerModalValidationSchema = Yup.object({
  name: Yup.string().trim().required('Name is required'),
  contact: Yup.string().trim().required('Contact number is required'),
  email: Yup.string().trim().email('Must be a valid email').required('Email address is required'),
});

const supplierModalValidationSchema = Yup.object({
  name: Yup.string().trim().required('Name is required'),
  contact: Yup.string().trim().required('Contact number is required'),
  email: Yup.string().trim().email('Must be a valid email').required('Email address is required'),
});

const productModalValidationSchema = Yup.object({
  name: Yup.string().trim().required('Name is required'),
  sku: Yup.string().trim().required('SKU Code is required'),
});

const categoryModalValidationSchema = Yup.object({
  name: Yup.string().trim().required('Category name is required'),
});

export const InvoiceFormPage: React.FC = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { format } = useCurrency();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  const [pendingCustomerName, setPendingCustomerName] = useState('');
  const [pendingSupplierName, setPendingSupplierName] = useState('');
  const [pendingProductName, setPendingProductName] = useState('');
  const [pendingCategoryName, setPendingCategoryName] = useState('');

  const customerResolveRef = useRef<((customer: Customer) => void) | null>(null);
  const supplierResolveRef = useRef<((supplier: Supplier) => void) | null>(null);
  const productResolveRef = useRef<((product: Product) => void) | null>(null);
  const categoryResolveRef = useRef<((category: Category) => void) | null>(null);
  
  const formikRef = React.useRef<any>(null);

  const loadData = async () => {
    try {
      const [prodRes, custRes, suppRes, catRes] = await Promise.all([
        fetchProducts(),
        fetchCustomers(),
        fetchSuppliers(),
        fetchCategories()
      ]);
      setProducts(prodRes.filter((p: Product) => p.status === 'Active' || !p.status));
      setCustomers(custRes);
      setSuppliers(suppRes);
      setCategories(catRes);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const initialValues = {
    type: 'SALES' as 'SALES' | 'PURCHASE',
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    supplierId: '',
    paymentType: 'CASH',
    cashAmount: 0,
    bankAmount: 0,
    items: [
      { productId: '', quantity: 1, unitPrice: 0 }
    ]
  };

  return (
    <Formik
      innerRef={formikRef}
      initialValues={initialValues}
      validationSchema={invoiceValidationSchema}
      onSubmit={async (values, { setSubmitting }) => {
        try {
          setSubmitting(true);
          const validItems = values.items.filter(i => i.productId && Number(i.quantity) > 0);
          if (validItems.length === 0) {
            errorToast('Please add at least one valid item');
            return;
          }

          const payload = {
            type: values.type,
            date: values.date,
            customerId: values.type === 'SALES' ? values.customerId : undefined,
            supplierId: values.type === 'PURCHASE' ? values.supplierId : undefined,
            paymentType: values.paymentType,
            cashAmount: values.paymentType === 'PARTIAL' ? values.cashAmount : undefined,
            bankAmount: values.paymentType === 'PARTIAL' ? values.bankAmount : undefined,
            items: validItems.map(i => ({
              productId: i.productId,
              quantity: Number(i.quantity),
              unitPrice: Number(i.unitPrice)
            }))
          };

          await createInvoice(payload);
          successToast('Invoice created successfully');
          navigate('/invoices');
        } catch (error: any) {
          errorToast(error.response?.data?.error || 'Failed to create invoice');
          console.error(error);
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ values, submitForm, isSubmitting, setFieldValue }) => {
        const calculateTotal = () => {
          return values.items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0);
        };

        return (
          <FormPageLayout
            title={isEditMode ? 'Edit Invoice' : 'New Invoice'}
            metadata={isEditMode ? {
              createdBy: 'Admin',
              createdAt: '2 days ago',
              lastEditedBy: 'Current User',
              lastEditedAt: 'Just now'
            } : undefined}
            onSave={submitForm}
            onCancel={() => navigate('/invoices')}
            isSubmitting={isSubmitting}
          >
            <Form noValidate className="max-w-4xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SelectOutlinedField
                    name="type"
                    label="Invoice Type"
                    options={[
                      { label: 'Sales Invoice', value: 'SALES' },
                      { label: 'Purchase Invoice', value: 'PURCHASE' }
                    ]}
                    onChange={(newVal) => {
                      setFieldValue('type', newVal);
                      values.items.forEach((item, idx) => {
                        if (item.productId) {
                          const prod = products.find(p => p.id === item.productId);
                          if (prod) {
                            setFieldValue(`items.${idx}.unitPrice`, newVal === 'SALES' ? prod.selling_price : prod.cost_price);
                          }
                        }
                      });
                    }}
                  />
                  <DatePickerComponent name="date" label="Invoice Date" />

                  {values.type === 'SALES' && (
                    <ReusableAutocomplete
                      keyName="customerId"
                      label="Customer"
                      placeholder="Search customer..."
                      options={customers}
                      getOptionLabel={(c) => c.name}
                      compareKey="id"
                      creatable
                      onCreate={(inputValue) => {
                        setPendingCustomerName(inputValue);
                        setIsCustomerModalOpen(true);
                        return new Promise<Customer>((resolve) => {
                          customerResolveRef.current = resolve;
                        });
                      }}
                    />
                  )}

                  {values.type === 'PURCHASE' && (
                    <ReusableAutocomplete
                      keyName="supplierId"
                      label="Supplier"
                      placeholder="Search supplier..."
                      options={suppliers}
                      getOptionLabel={(s) => s.name}
                      compareKey="id"
                      creatable
                      onCreate={(inputValue) => {
                        setPendingSupplierName(inputValue);
                        setIsSupplierModalOpen(true);
                        return new Promise<Supplier>((resolve) => {
                          supplierResolveRef.current = resolve;
                        });
                      }}
                    />
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <SelectOutlinedField
                  name="paymentType"
                  label="Payment Method"
                  options={[
                    { label: 'Cash', value: 'CASH' },
                    { label: 'Bank', value: 'BANK' },
                    { label: 'Credit (Unpaid)', value: 'CREDIT' },
                    { label: 'Partial (Cash + Bank)', value: 'PARTIAL' }
                  ]}
                />
              </div>

              {values.paymentType === 'PARTIAL' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <TextFieldComponent name="cashAmount" label="Cash Amount Paid" type="number" />
                  <TextFieldComponent name="bankAmount" label="Bank Amount Paid" type="number" />
                </div>
              )}

              <div>
                <FieldArray name="items">
                  {({ push, remove }) => (
                      <div className="space-y-4">
                        {values.items.map((item, index) => (
                          <div key={index} className="flex flex-col md:flex-row items-start gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="flex-1 w-full flex items-center gap-2">
                                <Box sx={{ flex: 1 }}>
                                  <ReusableAutocomplete
                                    keyName={`items.${index}.productId`}
                                    label="Product / SKU"
                                    placeholder="Select Product..."
                                    options={products}
                                    getOptionLabel={(p: Product) => p ? `${p.sku} - ${p.name} (Stock: ${p.quantity})` : ''}
                                    compareKey="id"
                                    creatable
                                    onCreate={(inputValue) => {
                                      setPendingProductName(inputValue);
                                      setIsProductModalOpen(true);
                                      return new Promise<Product>((resolve) => {
                                        productResolveRef.current = resolve;
                                      });
                                    }}
                                    onChange={(prod: any) => {
                                      if (prod) {
                                        setFieldValue(`items.${index}.productId`, prod.id);
                                        setFieldValue(`items.${index}.unitPrice`, values.type === 'SALES' ? prod.selling_price : prod.cost_price);
                                      } else {
                                        setFieldValue(`items.${index}.productId`, '');
                                        setFieldValue(`items.${index}.unitPrice`, 0);
                                      }
                                    }}
                                  />
                                </Box>
                              <Tooltip title="Manage Products">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => navigate('/inventory')}
                                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', width: '40px', height: '40px' }}
                                >
                                  <ExternalLink size={18} />
                                </IconButton>
                              </Tooltip>
                            </div>
                            <div className="w-full md:w-32">
                              <TextFieldComponent name={`items.${index}.quantity`} label="Quantity" type="number" placeholder="1" />
                            </div>
                            <div className="w-full md:w-36">
                              <TextFieldComponent name={`items.${index}.unitPrice`} label="Unit Price ($)" type="number" placeholder="0.00" />
                            </div>
                            <div className="w-full md:w-32">
                              <Box sx={{ height: 40, display: 'flex', alignItems: 'center', px: 2, bgcolor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', fontWeight: 600 }}>
                                {format((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}
                              </Box>
                            </div>
                            <div>
                              <Tooltip title="Remove item">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    disabled={values.items.length === 1}
                                    onClick={() => remove(index)}
                                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', width: '40px', height: '40px' }}
                                  >
                                    <Trash2 size={18} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </div>
                          </div>
                        ))}
                        <div className="mt-6 flex justify-between items-center border-t border-gray-100 pt-4">
                          <Button type="button" variant="text" color="primary" startIcon={<Plus size={18} />} onClick={() => push({ productId: '', quantity: 1, unitPrice: 0 })}>
                            Add Another Line
                          </Button>
                        </div>
                      </div>
                    )}
                  </FieldArray>
                </div>

              <div className="max-w-md ml-auto bg-gray-50 rounded-xl border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-500 font-medium">Subtotal</span>
                  <span className="font-semibold text-gray-900">{format(calculateTotal())}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-500 font-medium">Tax</span>
                  <span className="font-semibold text-gray-900">{format(0)}</span>
                </div>
                <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-primary">{format(calculateTotal())}</span>
                </div>
              </div>
            </Form>

            {/* Modals outside of tabs */}
            {isCustomerModalOpen && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl relative">
                  <h2 className="text-lg font-bold text-gray-900 mb-5">Add New Customer</h2>
                  <Formik
                    initialValues={{ name: pendingCustomerName, contact: '', email: '' }}
                    enableReinitialize
                    validationSchema={customerModalValidationSchema}
                    onSubmit={async (val, { resetForm, setSubmitting }) => {
                      try {
                        setSubmitting(true);
                        const res = await createCustomer({ name: val.name.trim(), contact: val.contact.trim(), email: val.email.trim() });
                        await loadData();
                        if (customerResolveRef.current) {
                          customerResolveRef.current(res);
                          customerResolveRef.current = null;
                        } else {
                          formikRef.current?.setFieldValue('customerId', res.id);
                        }
                        setIsCustomerModalOpen(false);
                        resetForm();
                        successToast('Customer created');
                      } catch (error) {
                        errorToast('Failed to create customer');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  >
                    {({ isSubmitting, submitForm }) => (
                      <Form noValidate>
                        <TextFieldComponent name="name" label="Customer Name *" placeholder="e.g. Global Tech Ltd" autoFocus />
                        <div className="mt-4">
                          <TextFieldComponent name="contact" label="Contact Number *" placeholder="e.g. +1 555-0199" />
                        </div>
                        <div className="mt-4">
                          <TextFieldComponent name="email" label="Email Address *" placeholder="e.g. customer@example.com" />
                        </div>
                        <div className="flex justify-end gap-3 pt-6 mt-4">
                          <Button type="button" variant="text" color="inherit" onClick={() => { setIsCustomerModalOpen(false); customerResolveRef.current = null; }}>Cancel</Button>
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

            {isSupplierModalOpen && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl relative">
                  <h2 className="text-lg font-bold text-gray-900 mb-5">Add New Supplier</h2>
                  <Formik
                    initialValues={{ name: pendingSupplierName, contact: '', email: '' }}
                    enableReinitialize
                    validationSchema={supplierModalValidationSchema}
                    onSubmit={async (val, { resetForm, setSubmitting }) => {
                      try {
                        setSubmitting(true);
                        const res = await createSupplier({ name: val.name.trim(), contact: val.contact.trim(), email: val.email.trim() });
                        await loadData();
                        if (supplierResolveRef.current) {
                          supplierResolveRef.current(res);
                          supplierResolveRef.current = null;
                        } else {
                          formikRef.current?.setFieldValue('supplierId', res.id);
                        }
                        setIsSupplierModalOpen(false);
                        resetForm();
                        successToast('Supplier created');
                      } catch (error) {
                        errorToast('Failed to create supplier');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  >
                    {({ isSubmitting, submitForm }) => (
                      <Form noValidate>
                        <TextFieldComponent name="name" label="Supplier Name *" placeholder="e.g. Acme Supplies" autoFocus />
                        <div className="mt-4">
                          <TextFieldComponent name="contact" label="Contact Number *" placeholder="e.g. +1 555-0199" />
                        </div>
                        <div className="mt-4">
                          <TextFieldComponent name="email" label="Email Address *" placeholder="e.g. supplier@example.com" />
                        </div>
                        <div className="flex justify-end gap-3 pt-6 mt-4">
                          <Button type="button" variant="text" color="inherit" onClick={() => { setIsSupplierModalOpen(false); supplierResolveRef.current = null; }}>Cancel</Button>
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

            {/* Product Modal */}
            {isProductModalOpen && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl relative">
                  <h2 className="text-lg font-bold text-gray-900 mb-5">Add New Product Master</h2>
                  <Formik
                    initialValues={{ name: pendingProductName, sku: '', categoryId: '' }}
                    enableReinitialize
                    validationSchema={productModalValidationSchema}
                    onSubmit={async (val, { resetForm, setSubmitting }) => {
                      try {
                        setSubmitting(true);
                        const newProductPayload: any = {
                          name: val.name.trim(),
                          sku: val.sku.trim(),
                          categoryId: val.categoryId || categories[0]?.id || '', // fallback
                          supplierId: suppliers[0]?.id || '', // dummy fallback
                          cost_price: 0,
                          selling_price: 0,
                          min_stock: 0,
                          quantity: 0,
                          status: 'Active',
                          location: ''
                        };

                        if (!newProductPayload.categoryId || !newProductPayload.supplierId) {
                           errorToast('Please ensure you have at least one Category and Supplier created first.');
                           setSubmitting(false);
                           return;
                        }

                        const res = await createProduct(newProductPayload);
                        await loadData();
                        if (productResolveRef.current) {
                          productResolveRef.current(res);
                          productResolveRef.current = null;
                        }
                        setIsProductModalOpen(false);
                        resetForm();
                        successToast('Product Master created');
                      } catch (error) {
                        errorToast('Failed to create Product Master');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  >
                    {({ isSubmitting, submitForm }) => (
                      <Form noValidate>
                        <TextFieldComponent name="name" label="Name" placeholder="Enter name..." autoFocus />
                        <div className="mt-4">
                          <TextFieldComponent name="sku" label="SKU Code" placeholder="e.g. MAT-1001" />
                        </div>
                        <div className="mt-4">
                          <ReusableAutocomplete
                            keyName="categoryId"
                            label="Category Type (Optional)"
                            placeholder="Search or add category..."
                            options={categories}
                            getOptionLabel={(cat: Category) => cat?.name || ''}
                            compareKey="id"
                            creatable
                            onCreate={(inputValue) => {
                              return new Promise((resolve) => {
                                setPendingCategoryName(inputValue);
                                categoryResolveRef.current = resolve;
                                setShowCategoryModal(true);
                              });
                            }}
                          />
                        </div>
                        <div className="flex justify-end gap-3 pt-6 mt-4">
                          <Button type="button" variant="text" color="inherit" onClick={() => { setIsProductModalOpen(false); productResolveRef.current = null; }}>Cancel</Button>
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

            {/* Category Modal (for nested creation) */}
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
                        if (categoryResolveRef.current) {
                          categoryResolveRef.current(newCat);
                          categoryResolveRef.current = null;
                        }
                        setShowCategoryModal(false);
                        successToast(`Category "${newCat.name}" created`);
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
                          <Button type="button" variant="text" color="inherit" onClick={() => { setShowCategoryModal(false); categoryResolveRef.current = null; }}>Cancel</Button>
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

          </FormPageLayout>
        );
      }}
    </Formik>
  );
};

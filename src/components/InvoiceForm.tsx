import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { Formik, Form, FieldArray } from 'formik';
import * as Yup from 'yup';
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import { fetchInventory, fetchCustomers, fetchSuppliers, createInvoice, createCustomer, createSupplier } from '../services/api';
import type { Product, Customer, Supplier } from '../types';
import { successToast, errorToast } from '../helper/toast';
import { TextFieldComponent, SelectOutlinedField, DatePickerComponent } from './input/index';

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
  items: Yup.array().of(
    Yup.object({
      productId: Yup.string().required('Product is required'),
      quantity: Yup.number().typeError('Must be a number').min(1, 'Min 1').required('Required'),
      unitPrice: Yup.number().typeError('Must be a number').min(0, 'Min 0').required('Required'),
    })
  ).min(1, 'Please add at least one item')
});

const subModalValidationSchema = Yup.object({
  name: Yup.string().trim().required('Name is required'),
  contact: Yup.string().trim(),
});

export const InvoiceForm: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  const mainSetFieldValueRef = React.useRef<((field: string, value: any) => void) | null>(null);

  const loadData = async () => {
    try {
      const [prodRes, custRes, suppRes] = await Promise.all([
        fetchInventory(),
        fetchCustomers(),
        fetchSuppliers()
      ]);
      setProducts(prodRes);
      setCustomers(custRes);
      setSuppliers(suppRes);
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
    items: [
      { productId: '', quantity: 1, unitPrice: 0 }
    ]
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Invoice</h1>
        <p className="text-gray-500 mt-1">Generate a new sales or purchase invoice with real-time totals.</p>
      </div>

      <Formik
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
        {({ values, setFieldValue, isSubmitting }) => {
          mainSetFieldValueRef.current = setFieldValue;

          const calculateTotal = () => {
            return values.items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0);
          };

          return (
            <Form noValidate className="bg-white shadow-sm border border-gray-100 rounded-3xl p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <SelectOutlinedField
                    name="type"
                    label="Invoice Type"
                    options={[
                      { label: 'Sales Invoice', value: 'SALES' },
                      { label: 'Purchase Invoice', value: 'PURCHASE' }
                    ]}
                    onChange={(newVal) => {
                      setFieldValue('type', newVal);
                      // Update unit prices for existing items based on sales vs purchase
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
                </div>
                <div>
                  <DatePickerComponent
                    name="date"
                    label="Invoice Date"
                  />
                </div>

                {values.type === 'SALES' && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', width: '100%' }}>
                    <Box sx={{ flex: 1 }}>
                      <SelectOutlinedField
                        name="customerId"
                        label="Customer"
                        placeholder="Select Customer..."
                        options={customers.map(c => ({ label: c.name, value: c.id }))}
                      />
                    </Box>
                    <Tooltip title="Add new customer">
                      <IconButton
                        size="small"
                        color="primary"
                        tabIndex={-1}
                        onClick={() => setIsCustomerModalOpen(true)}
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
                )}

                {values.type === 'PURCHASE' && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', width: '100%' }}>
                    <Box sx={{ flex: 1 }}>
                      <SelectOutlinedField
                        name="supplierId"
                        label="Supplier"
                        placeholder="Select Supplier..."
                        options={suppliers.map(s => ({ label: s.name, value: s.id }))}
                      />
                    </Box>
                    <Tooltip title="Add new supplier">
                      <IconButton
                        size="small"
                        color="primary"
                        tabIndex={-1}
                        onClick={() => setIsSupplierModalOpen(true)}
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
                )}
              </div>

              <div className="border-t border-gray-100 pt-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Invoice Items</h3>

                <FieldArray name="items">
                  {({ push, remove }) => (
                    <div className="space-y-4">
                      {values.items.map((item, index) => (
                        <div key={index} className="flex flex-col md:flex-row items-start gap-3">
                          <div className="flex-1 w-full flex items-center gap-2">
                            <Box sx={{ flex: 1 }}>
                              <SelectOutlinedField
                                name={`items.${index}.productId`}
                                label="Product / SKU"
                                placeholder="Select Product..."
                                options={products.map(p => ({ label: `${p.sku} - ${p.name}`, value: p.id || '' }))}
                                onChange={(prodId) => {
                                  setFieldValue(`items.${index}.productId`, prodId);
                                  const prod = products.find(p => p.id === prodId);
                                  if (prod) {
                                    setFieldValue(`items.${index}.unitPrice`, values.type === 'SALES' ? prod.selling_price : prod.cost_price);
                                  }
                                }}
                              />
                            </Box>
                            <Tooltip title="Manage Products">
                              <IconButton
                                size="small"
                                color="primary"
                                tabIndex={-1}
                                onClick={() => navigate('/inventory')}
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
                                <ExternalLink size={18} />
                              </IconButton>
                            </Tooltip>
                          </div>

                          <div className="w-full md:w-32">
                            <TextFieldComponent
                              name={`items.${index}.quantity`}
                              label="Quantity"
                              type="number"
                              placeholder="1"
                            />
                          </div>

                          <div className="w-full md:w-36">
                            <TextFieldComponent
                              name={`items.${index}.unitPrice`}
                              label="Unit Price ($)"
                              type="number"
                              placeholder="0.00"
                            />
                          </div>

                          <div className="w-full md:w-32">
                            <Box
                              sx={{
                                height: 40,
                                display: 'flex',
                                alignItems: 'center',
                                px: 2,
                                bgcolor: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                borderRadius: '14px',
                                fontWeight: 600,
                                color: 'text.primary',
                                fontSize: '0.9rem'
                              }}
                            >
                              ${((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toFixed(2)}
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
                                  sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: '12px',
                                    width: '40px',
                                    height: '40px',
                                    flexShrink: 0,
                                    '&:hover': {
                                      backgroundColor: 'error.lighter',
                                      borderColor: 'error.main'
                                    }
                                  }}
                                >
                                  <Trash2 size={18} />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </div>
                        </div>
                      ))}

                      <div className="mt-6 flex justify-between items-center border-t border-gray-100 pt-4">
                        <Button
                          type="button"
                          variant="text"
                          color="primary"
                          startIcon={<Plus size={18} />}
                          onClick={() => push({ productId: '', quantity: 1, unitPrice: 0 })}
                          sx={{ fontWeight: 600 }}
                        >
                          Add Another Line
                        </Button>
                        <div className="text-xl font-bold text-gray-900">
                          Total: ${calculateTotal().toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                </FieldArray>
              </div>

              <div className="flex items-center gap-4 justify-end pt-6 border-t border-gray-100">
                <Button 
                  type="button"
                  variant="text"
                  color="primary"
                  onClick={() => navigate('/invoices')}
                  sx={{ px: 3.5, py: 1.2, fontWeight: 600, fontSize: '0.95rem' }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting}
                  sx={{ px: 4.5, py: 1.2, fontWeight: 600, fontSize: '0.95rem' }}
                >
                  {isSubmitting ? 'Creating...' : 'Create Invoice'}
                </Button>
              </div>
            </Form>
          );
        }}
      </Formik>

      {/* Customer Sub-Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl relative">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Add New Customer</h2>
            <Formik
              initialValues={{ name: '', contact: '' }}
              validationSchema={subModalValidationSchema}
              onSubmit={async (val, { resetForm, setSubmitting }) => {
                try {
                  setSubmitting(true);
                  const res = await createCustomer({ name: val.name.trim(), contact: val.contact.trim() });
                  await loadData();
                  mainSetFieldValueRef.current?.('customerId', res.id);
                  setIsCustomerModalOpen(false);
                  resetForm();
                  successToast('Customer created successfully');
                } catch (error: any) {
                  console.error('Failed to create customer', error);
                  errorToast(error?.response?.data?.error || 'Failed to create customer');
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {({ isSubmitting }) => (
                <Form noValidate>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <TextFieldComponent 
                      name="name" 
                      label="Customer Name" 
                      placeholder="e.g. Global Tech Ltd" 
                      autoFocus 
                    />
                    <TextFieldComponent 
                      name="contact" 
                      label="Contact Number" 
                      placeholder="e.g. +1 555-0199" 
                    />
                  </Box>
                  <div className="flex justify-end gap-3 pt-6">
                    <Button 
                      type="button" 
                      variant="text"
                      color="inherit"
                      onClick={() => setIsCustomerModalOpen(false)} 
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
              )}
            </Formik>
          </div>
        </div>
      )}

      {/* Supplier Sub-Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl relative">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Add New Supplier</h2>
            <Formik
              initialValues={{ name: '', contact: '' }}
              validationSchema={subModalValidationSchema}
              onSubmit={async (val, { resetForm, setSubmitting }) => {
                try {
                  setSubmitting(true);
                  const res = await createSupplier({ name: val.name.trim(), contact: val.contact.trim() });
                  await loadData();
                  mainSetFieldValueRef.current?.('supplierId', res.id);
                  setIsSupplierModalOpen(false);
                  resetForm();
                  successToast('Supplier created successfully');
                } catch (error: any) {
                  console.error('Failed to create supplier', error);
                  errorToast(error?.response?.data?.error || 'Failed to create supplier');
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {({ isSubmitting }) => (
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
                      label="Contact Number" 
                      placeholder="e.g. +1 555-0199" 
                    />
                  </Box>
                  <div className="flex justify-end gap-3 pt-6">
                    <Button 
                      type="button" 
                      variant="text"
                      color="inherit"
                      onClick={() => setIsSupplierModalOpen(false)} 
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
              )}
            </Formik>
          </div>
        </div>
      )}
    </div>
  );
};
export default InvoiceForm;

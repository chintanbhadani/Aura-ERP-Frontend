import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Plus, Database } from 'lucide-react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import { 
  fetchCategories, createCategory, updateCategory, deleteCategory,
  fetchSuppliers, createSupplier, updateSupplier, deleteSupplier,
  fetchUnits, createUnit, updateUnit, deleteUnit,
  fetchCustomers, createCustomer, updateCustomer, deleteCustomer,
  fetchSkus, createSku, updateSku, deleteSku
} from '../services/api';
import { successToast, errorToast } from '../helper/toast';
import { TextFieldComponent, SelectOutlinedField, ReusableAutocomplete } from './input/index';
import { DataTable } from './Table/DataTable';

type MasterDataType = 'categories' | 'suppliers' | 'units' | 'customers' | 'skus';

const masterValidationSchema = Yup.object({
  name: Yup.string().trim().required('Name is required'),
  contact: Yup.string().trim(),
  email: Yup.string().trim().email('Must be a valid email'),
  sku: Yup.string().trim() // For SKUs
});

const categoryModalValidationSchema = Yup.object({
  name: Yup.string().trim().required('Category name is required'),
});

export const MasterData: React.FC = () => {
  const { type } = useParams<{ type: MasterDataType }>();
  const navigate = useNavigate();

  const [data, setData] = useState<any[]>([]);
  const [categoriesForSku, setCategoriesForSku] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pendingCategoryName, setPendingCategoryName] = useState('');
  const categoryResolveRef = useRef<((cat: any) => void) | null>(null);

  const isValidType = type === 'categories' || type === 'suppliers' || type === 'units' || type === 'customers' || type === 'skus';

  useEffect(() => {
    if (!isValidType) {
      navigate('/');
    } else {
      loadData();
    }
  }, [type]);

  const loadData = async () => {
    try {
      if (type === 'categories') {
        const res = await fetchCategories();
        setData(res);
      } else if (type === 'suppliers') {
        const res = await fetchSuppliers();
        setData(res);
      } else if (type === 'units') {
        const res = await fetchUnits();
        setData(res);
      } else if (type === 'customers') {
        const res = await fetchCustomers();
        setData(res);
      } else if (type === 'skus') {
        const res = await fetchSkus();
        setData(res);
        if (categoriesForSku.length === 0) {
          fetchCategories().then(setCategoriesForSku).catch(console.error);
        }
      }
    } catch (error) {
      console.error('Failed to load data', error);
    }
  };

  const getTitle = () => {
    switch(type) {
      case 'categories': return 'Category Master';
      case 'suppliers': return 'Supplier Master';
      case 'units': return 'Unit Master';
      case 'customers': return 'Customer Master';
      case 'skus': return 'SKU Master';
      default: return 'Master Data';
    }
  };

  const openModal = (item: any = null) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      if (type === 'categories') await deleteCategory(id);
      else if (type === 'suppliers') await deleteSupplier(id);
      else if (type === 'units') await deleteUnit(id);
      else if (type === 'customers') await deleteCustomer(id);
      else if (type === 'skus') await deleteSku(id);
      successToast('Deleted successfully');
      loadData();
    } catch (error: any) {
      console.error('Error deleting data', error);
      errorToast(error?.response?.data?.error || 'Failed to delete. It might be in use.');
    }
  };

  if (!isValidType) return null;

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{getTitle()}</h1>
        <p className="text-gray-500 mt-1">Manage {type} data for the system.</p>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-gray-900 capitalize">{type} List</h2>
          </div>
          <Button 
            variant="contained"
            color="primary"
            startIcon={<Plus className="w-4 h-4" />}
            onClick={() => openModal()}
            sx={{ px: 3, py: 1, fontWeight: 600 }}
          >
            Add New
          </Button>
        </div>

        <DataTable
          data={data}
          columns={[
            {
              header: 'Name',
              id: 'name',
              className: 'w-1/3',
              cell: ({ row }) => <span className="whitespace-nowrap text-gray-900 font-medium">{row.name}</span>
            },
            ...((type === 'suppliers' || type === 'customers') ? [
              {
                header: 'Contact',
                id: 'contact',
                cell: ({ row }: { row: any }) => <span className="whitespace-nowrap text-gray-600 text-sm">{row.contact || '-'}</span>
              },
              {
                header: 'Email',
                id: 'email',
                cell: ({ row }: { row: any }) => <span className="whitespace-nowrap text-gray-600 text-sm">{row.email || '-'}</span>
              }
            ] : []),
            ...(type === 'skus' ? [
              {
                header: 'SKU Code',
                id: 'sku',
                cell: ({ row }: { row: any }) => <span className="whitespace-nowrap text-gray-600 text-sm">{row.sku}</span>
              },
              {
                header: 'Category',
                id: 'category',
                cell: ({ row }: { row: any }) => <span className="whitespace-nowrap text-gray-600 text-sm">{row.category?.name || '-'}</span>
              }
            ] : []),
            {
              header: 'Actions',
              id: 'actions',
              className: 'text-right',
              cell: ({ row }) => (
                <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                  <Tooltip title="Edit">
                    <IconButton size="small" color="primary" onClick={() => openModal(row)}>
                      <Pencil className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}>
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                </div>
              )
            }
          ]}
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl relative">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editingItem ? 'Edit' : 'Add New'} {type === 'categories' ? 'Category' : type === 'suppliers' ? 'Supplier' : type === 'customers' ? 'Customer' : type === 'skus' ? 'SKU' : 'Unit'}
            </h2>
            
            <Formik
              initialValues={{
                name: editingItem?.name || '',
                contact: editingItem?.contact || '',
                email: editingItem?.email || '',
                sku: editingItem?.sku || '',
                categoryId: editingItem?.categoryId || '',
              }}
              validationSchema={masterValidationSchema}
              onSubmit={async (values, { setSubmitting }) => {
                try {
                  setSubmitting(true);
                  if (type === 'categories') {
                    if (editingItem) await updateCategory(editingItem.id, { name: values.name.trim() });
                    else await createCategory({ name: values.name.trim() });
                  } else if (type === 'suppliers') {
                    if (editingItem) await updateSupplier(editingItem.id, { name: values.name.trim(), contact: values.contact.trim(), email: values.email.trim() });
                    else await createSupplier({ name: values.name.trim(), contact: values.contact.trim(), email: values.email.trim() });
                  } else if (type === 'units') {
                    if (editingItem) await updateUnit(editingItem.id, { name: values.name.trim() });
                    else await createUnit({ name: values.name.trim() });
                  } else if (type === 'customers') {
                    if (editingItem) await updateCustomer(editingItem.id, { name: values.name.trim(), contact: values.contact.trim(), email: values.email.trim() });
                    else await createCustomer({ name: values.name.trim(), contact: values.contact.trim(), email: values.email.trim() });
                  } else if (type === 'skus') {
                    if (editingItem) await updateSku(editingItem.id, { name: values.name.trim(), sku: values.sku.trim(), categoryId: values.categoryId });
                    else await createSku({ name: values.name.trim(), sku: values.sku.trim(), categoryId: values.categoryId });
                  }
                  closeModal();
                  loadData();
                  successToast(`${editingItem ? 'Updated' : 'Created'} successfully`);
                } catch (error: any) {
                  console.error('Error saving data', error);
                  errorToast(error?.response?.data?.error || 'Failed to save data. Please check inputs.');
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
                      label="Name" 
                      placeholder="Enter name..." 
                      autoFocus 
                    />

                    {(type === 'suppliers' || type === 'customers') && (
                      <>
                        <TextFieldComponent 
                          name="contact" 
                          label="Contact Number" 
                          placeholder="e.g. +1 555-0199" 
                        />
                        <TextFieldComponent 
                          name="email" 
                          label="Email Address" 
                          type="email" 
                          placeholder="e.g. info@company.com" 
                        />
                      </>
                    )}

                    {type === 'skus' && (
                      <>
                        <TextFieldComponent 
                          name="sku" 
                          label="SKU Code" 
                          placeholder="e.g. MAT-1001" 
                        />
                        <ReusableAutocomplete
                          keyName="categoryId"
                          label="Category Type (Optional)"
                          placeholder="Search or add category..."
                          options={categoriesForSku}
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
                      </>
                    )}
                  </Box>

                  <div className="flex justify-end gap-3 pt-6">
                    <Button 
                      type="button" 
                      variant="text"
                      color="inherit"
                      onClick={closeModal} 
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
                      {isSubmitting ? 'Saving...' : 'Save Details'}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      )}

      {/* Add New Category Modal (z-[70] to appear above the main modal) */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl relative">
            <h3 className="text-lg font-bold text-gray-900 mb-5">Add New Category</h3>
            <Formik
              initialValues={{ name: pendingCategoryName }}
              validationSchema={categoryModalValidationSchema}
              onSubmit={async (val, { setSubmitting }) => {
                try {
                  setSubmitting(true);
                  const newCat = await createCategory({ name: val.name.trim() });
                  setCategoriesForSku((prev) => [...prev, newCat]);
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
    </div>
  );
};
export default MasterData;

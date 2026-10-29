import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Plus, Database } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
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
import { ListViewLayout } from './ListViewLayout';
import { CompactTable } from './CompactTable';
import type { ColumnDef } from './CompactTable';
import WithAuth from './WithAuth';
import { ModuleName, Permission } from '../helper/constants';

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

const MasterDataBase: React.FC = () => {
  const { type } = useParams<{ type: MasterDataType }>();
  const navigate = useNavigate();

  const [data, setData] = useState<any[]>([]);
  const [categoriesForSku, setCategoriesForSku] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pendingCategoryName, setPendingCategoryName] = useState('');
  const categoryResolveRef = useRef<((cat: any) => void) | null>(null);

  const isValidType = type === 'categories' || type === 'suppliers' || type === 'units' || type === 'customers' || type === 'skus';

  useEffect(() => {
    if (type === 'material-request' as any) {
      navigate('/material-request');
      return;
    }
    if (!isValidType) {
      navigate('/');
      return;
    }
    setSearchTerm('');
    setData([]);
    setLoading(true);
    loadData('');
  }, [type]);

  useEffect(() => {
    if (!isValidType || !searchTerm) return;
    const timer = setTimeout(() => {
      loadData(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadData = async (searchQuery?: string) => {
    setLoading(true);
    try {
      if (type === 'categories') {
        const res = await fetchCategories(searchQuery);
        setData(res);
      } else if (type === 'suppliers') {
        const res = await fetchSuppliers(searchQuery);
        setData(res);
      } else if (type === 'units') {
        const res = await fetchUnits(searchQuery);
        setData(res);
      } else if (type === 'customers') {
        const res = await fetchCustomers(searchQuery);
        setData(res);
      } else if (type === 'skus') {
        const res = await fetchSkus(searchQuery);
        setData(res);
        if (categoriesForSku.length === 0) {
          fetchCategories().then(setCategoriesForSku).catch(console.error);
        }
      }
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch(type) {
      case 'categories': return 'Category Master';
      case 'suppliers': return 'Supplier Master';
      case 'units': return 'Unit Master';
      case 'customers': return 'Customer Master';
      case 'skus': return 'Product Master';
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
      loadData(searchTerm);
    } catch (error: any) {
      console.error('Error deleting data', error);
      errorToast(error?.response?.data?.error || 'Failed to delete. It might be in use.');
    }
  };

  if (!isValidType) return null;

  return (
    <DashboardLayout>
      <ListViewLayout
        title={getTitle()}
        description={`Manage ${type === 'skus' ? 'Product Master' : type} data for the system.`}
        onAdd={() => type === 'skus' ? navigate('/products/new') : openModal()}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={type === 'skus' ? "Search by Name, SKU code, Category..." : "Search..."}
      >
        <CompactTable
          data={data}
          loading={loading}
          columns={[
            {
              key: 'name',
              title: 'Name',
              render: (val, row) => (
                <span 
                  onClick={() => type === 'skus' && navigate(`/products/edit?id=${row.id}`)} 
                  className={type === 'skus' ? 'font-semibold text-primary-700 hover:underline cursor-pointer' : 'font-medium text-gray-900'}
                >
                  {val}
                </span>
              )
            },
            ...((type === 'suppliers' || type === 'customers') ? [
              {
                key: 'contact',
                title: 'Contact',
                render: (val, row) => <span className="text-gray-600">{row.contact || '-'}</span>
              },
              {
                key: 'email',
                title: 'Email',
                render: (val, row) => <span className="text-gray-600">{row.email || '-'}</span>
              }
            ] as ColumnDef[] : []),
            ...(type === 'skus' ? [
              {
                key: 'sku',
                title: 'SKU Code',
                render: (val, row) => (
                  <span 
                    onClick={() => navigate(`/products/edit?id=${row.id}`)}
                    className="font-mono text-xs text-primary-600 font-semibold hover:underline cursor-pointer"
                  >
                    {row.sku}
                  </span>
                )
              },
              {
                key: 'category',
                title: 'Category',
                render: (val, row) => <span className="text-gray-600">{row.category?.name || '-'}</span>
              }
            ] as ColumnDef[] : []),
            {
              key: 'actions',
              title: 'Actions',
              render: (_, row) => (
                <div className="flex items-center gap-2">
                  <Tooltip title="Edit Item Details">
                    <IconButton 
                      size="small" 
                      color="primary" 
                      onClick={() => type === 'skus' ? navigate(`/products/edit?id=${row.id}`) : openModal(row)}
                    >
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
      </ListViewLayout>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl relative">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editingItem ? 'Edit' : 'Add New'} {type === 'categories' ? 'Category' : type === 'suppliers' ? 'Supplier' : type === 'customers' ? 'Customer' : type === 'skus' ? 'Product' : 'Unit'}
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
    </DashboardLayout>
  );
};
export const MasterData = WithAuth(MasterDataBase, ModuleName.MASTER_DATA, Permission.LIST);
export default MasterData;

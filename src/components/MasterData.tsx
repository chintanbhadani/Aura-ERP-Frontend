import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Plus, Database } from 'lucide-react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import { 
  fetchCategories, createCategory, updateCategory, bulkUploadCategories,
  fetchSuppliers, createSupplier, updateSupplier, bulkUploadSuppliers,
  fetchUnits, createUnit, updateUnit, bulkUploadUnits,
  fetchCustomers, createCustomer, updateCustomer, bulkUploadCustomers,
  fetchSkus, createSku, updateSku, bulkUploadSkus
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

  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleToggleStatus = async (item: any) => {
    const newStatus = item.status === 'Inactive' ? 'Active' : 'Inactive';
    try {
      if (type === 'categories') await updateCategory(item.id, { status: newStatus });
      else if (type === 'suppliers') await updateSupplier(item.id, { status: newStatus });
      else if (type === 'units') await updateUnit(item.id, { status: newStatus });
      else if (type === 'customers') await updateCustomer(item.id, { status: newStatus });
      else if (type === 'skus') await updateSku(item.id, { status: newStatus });
      successToast(`Status updated to ${newStatus}`);
      loadData();
    } catch (error: any) {
      console.error('Error updating status', error);
      errorToast(error?.response?.data?.error || 'Failed to update status.');
    }
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingBulk(true);
      if (type === 'categories') await bulkUploadCategories(file);
      else if (type === 'suppliers') await bulkUploadSuppliers(file);
      else if (type === 'units') await bulkUploadUnits(file);
      else if (type === 'customers') await bulkUploadCustomers(file);
      else if (type === 'skus') await bulkUploadSkus(file);
      
      successToast('Bulk upload successful');
      setIsBulkUploadModalOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Bulk upload error', error);
      errorToast(error?.response?.data?.error || 'Bulk upload failed');
    } finally {
      setUploadingBulk(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
          <div className="flex items-center gap-3">
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setIsBulkUploadModalOpen(true)}
              sx={{ px: 3, py: 1, fontWeight: 600, borderRadius: '9999px' }}
            >
              Bulk Upload
            </Button>
            <Button 
              variant="contained"
              color="primary"
              startIcon={<Plus className="w-4 h-4" />}
              onClick={() => openModal()}
              sx={{ px: 3, py: 1, fontWeight: 600, borderRadius: '9999px' }}
            >
              Add New
            </Button>
          </div>
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
              header: 'Active Status',
              id: 'active_status',
              cell: ({ row }) => (
                <span className={`whitespace-nowrap px-3 py-1 font-medium text-xs rounded-full ${row.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                  {row.status || 'Active'}
                </span>
              )
            },
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
                  <Tooltip title={row.status === 'Inactive' ? "Enable" : "Disable"}>
                    <Button 
                      size="small" 
                      color={row.status === 'Inactive' ? "success" : "error"} 
                      onClick={() => handleToggleStatus(row)}
                      sx={{ minWidth: 'auto', textTransform: 'none', fontSize: '12px' }}
                    >
                      {row.status === 'Inactive' ? "Enable" : "Disable"}
                    </Button>
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
              {editingItem ? 'Edit' : 'Add New'} {type === 'categories' ? 'Category' : type === 'suppliers' ? 'Supplier' : type === 'customers' ? 'Customer' : type === 'skus' ? 'Product Master' : 'Unit'}
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
      {/* Bulk Upload Modal */}
      {isBulkUploadModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl relative">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Bulk Upload {type}</h2>
            <p className="text-sm text-gray-500">Upload an Excel (.xlsx, .xls) file containing your data. Missing standard required fields like 'name' will be skipped.</p>
            <button 
              type="button"
              className="text-primary font-bold text-sm mb-6 hover:underline"
              onClick={() => {
                let headers = 'name';
                if (type === 'suppliers' || type === 'customers') headers = 'name,contact,email';
                if (type === 'skus') headers = 'name,sku';
                
                const csvContent = "data:text/csv;charset=utf-8," + headers + "\n";
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `${type}_sample.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              Download sample template.
            </button>
            
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50 mb-6">
              <Database className="w-10 h-10 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 text-center mb-4">Select an Excel file from your computer</p>
              
              <input 
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleBulkUpload}
              />
              
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingBulk}
                sx={{ borderRadius: '9999px', textTransform: 'none', px: 4 }}
              >
                {uploadingBulk ? 'Uploading...' : 'Choose file'}
              </Button>
            </div>
            
            <div className="flex justify-end pt-2">
              <Button 
                variant="text" 
                color="inherit" 
                onClick={() => setIsBulkUploadModalOpen(false)}
                disabled={uploadingBulk}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default MasterData;

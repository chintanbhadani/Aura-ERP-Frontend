import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Formik, Form, type FormikProps } from 'formik';
import * as Yup from 'yup';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { ERPFormHeader } from '../../components/ERPForm/ERPFormHeader';
import { fetchUserProfile } from '../../services/auth.service';
import { setRoleDetails } from '../../slices/Base';
import { 
  fetchRoleById, 
  fetchRolePermissionsMatrix, 
  createRole, 
  updateRole, 
  deleteRole,
  type RoleRecord, 
  type ModuleWithPermissions, 
  type ModulePermissionSelection 
} from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { TextFieldComponent } from '../../components/input/index';
import { 
  ShieldCheck, 
  Check, 
  Search, 
  ArrowLeft, 
  Trash2, 
  Copy, 
  Loader2, 
  CheckSquare, 
  Square,
  Sparkles,
  Layers,
  Filter
} from 'lucide-react';

const roleValidationSchema = Yup.object().shape({
  name: Yup.string().trim().required('Role Name is required'),
  code: Yup.string().nullable(),
  status: Yup.string().oneOf(['Active', 'Inactive']).default('Active'),
  description: Yup.string().nullable(),
});

const RoleFormPageBase: React.FC = () => {
  const { id: routeId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id');
  const id = routeId || queryId || undefined;
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isEditMode = Boolean(id && id !== 'new');

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [modules, setModules] = useState<ModuleWithPermissions[]>([]);
  const [roleData, setRoleData] = useState<RoleRecord | null>(null);

  // Form inputs
  const [formState, setFormState] = useState({
    name: '',
    code: '',
    description: '',
    status: 'Active' as 'Active' | 'Inactive'
  });
  const [nameTouched, setNameTouched] = useState<boolean>(false);

  // Selected permissions: array of { module: moduleId, permissions: number[] }
  const [selectedModules, setSelectedModules] = useState<ModulePermissionSelection[]>([]);

  // Search filter inside permissions table
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Load initial data
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        // Fetch permissions matrix
        const moduleList = await fetchRolePermissionsMatrix();
        if (isMounted) {
          setModules(moduleList);
        }

        // If edit mode, fetch role details
        if (isEditMode && id) {
          const role = await fetchRoleById(id);
          if (isMounted && role) {
            setRoleData(role);
            setFormState({
              name: role.name || '',
              code: role.code || '',
              description: role.description || '',
              status: (role.status === 'Inactive' ? 'Inactive' : 'Active')
            });
            if (Array.isArray(role.permissionDetails)) {
              setSelectedModules(role.permissionDetails);
            }
          }
        }
      } catch (err: any) {
        console.error('Failed to load role permissions data:', err);
        errorToast('Failed to load role permissions');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [id, isEditMode]);

  // Total permissions available
  const totalPermissionsCount = useMemo(() => {
    return modules.reduce((acc, m) => acc + (m.moduleDetail?.length || 0), 0);
  }, [modules]);

  // Total permissions currently selected
  const selectedPermissionsCount = useMemo(() => {
    return selectedModules.reduce((acc, sm) => acc + (sm.permissions?.length || 0), 0);
  }, [selectedModules]);

  // Check if all permissions across all modules are selected
  const isAllSelected = useMemo(() => {
    if (modules.length === 0 || totalPermissionsCount === 0) return false;
    return selectedPermissionsCount === totalPermissionsCount;
  }, [modules, totalPermissionsCount, selectedPermissionsCount]);

  // Check if a specific permission is checked
  const isPermissionChecked = (moduleId: number, permissionId: number): boolean => {
    const mod = selectedModules.find(m => m.module === moduleId);
    return !!mod && mod.permissions.includes(permissionId);
  };

  // Check if all permissions for a specific module are checked
  const isModuleAllChecked = (moduleItem: ModuleWithPermissions): boolean => {
    const mod = selectedModules.find(m => m.module === moduleItem.id);
    if (!mod || !moduleItem.moduleDetail || moduleItem.moduleDetail.length === 0) return false;
    return moduleItem.moduleDetail.every(p => mod.permissions.includes(p.id));
  };

  // Toggle single permission
  const handlePermissionChange = (moduleId: number, permissionId: number, isChecked: boolean) => {
    setSelectedModules(prev => {
      const existing = prev.find(m => m.module === moduleId);

      if (isChecked) {
        if (existing) {
          if (!existing.permissions.includes(permissionId)) {
            return prev.map(m =>
              m.module === moduleId
                ? { ...m, permissions: [...m.permissions, permissionId] }
                : m
            );
          }
          return prev;
        } else {
          return [...prev, { module: moduleId, permissions: [permissionId] }];
        }
      } else {
        if (existing) {
          const updated = existing.permissions.filter(p => p !== permissionId);
          if (updated.length === 0) {
            return prev.filter(m => m.module !== moduleId);
          }
          return prev.map(m =>
            m.module === moduleId ? { ...m, permissions: updated } : m
          );
        }
        return prev;
      }
    });
  };

  // Master Select All / Deselect All across all modules
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedModules([]);
      successToast('Deselected all permissions');
    } else {
      const allPermissions: ModulePermissionSelection[] = modules.map(m => ({
        module: m.id,
        permissions: m.moduleDetail.map(p => p.id)
      }));
      setSelectedModules(allPermissions);
      successToast('Granted all administrator permissions');
    }
  };

  // Toggle all permissions for a single module
  const handleToggleModuleAll = (moduleItem: ModuleWithPermissions) => {
    const allChecked = isModuleAllChecked(moduleItem);
    const modId = moduleItem.id;
    const allPermIds = moduleItem.moduleDetail.map(p => p.id);

    setSelectedModules(prev => {
      const existing = prev.find(m => m.module === modId);

      if (allChecked) {
        // Deselect all for this module
        return prev.filter(m => m.module !== modId);
      } else {
        // Select all for this module
        if (existing) {
          return prev.map(m => m.module === modId ? { ...m, permissions: allPermIds } : m);
        } else {
          return [...prev, { module: modId, permissions: allPermIds }];
        }
      }
    });
  };

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    modules.forEach(m => {
      if (m.category) set.add(m.category);
    });
    return ['All', ...Array.from(set)];
  }, [modules]);

  // Filter modules based on search query & category
  const filteredModules = useMemo(() => {
    return modules.filter(m => {
      if (selectedCategory !== 'All' && m.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchName = m.name.toLowerCase().includes(q);
      const matchCategory = (m.category || '').toLowerCase().includes(q);
      const matchPerm = m.moduleDetail?.some(p => p.name.toLowerCase().includes(q));

      return matchName || matchCategory || matchPerm;
    });
  }, [modules, searchQuery, selectedCategory]);

  const formikRef = useRef<FormikProps<any>>(null);

  // Form Submit
  const handleFormikSubmit = async (values: typeof formState) => {
    if (selectedModules.length === 0) {
      errorToast('Please select at least one permission');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<RoleRecord> = {
        name: values.name.trim(),
        code: values.code?.trim() || values.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
        description: (values.description || '').trim(),
        status: values.status,
        permissionDetails: selectedModules
      };

      if (isEditMode && id) {
        await updateRole(id, payload);
        successToast('Role and permissions updated successfully');
      } else {
        const created = await createRole(payload);
        successToast('Role and permissions created successfully');
        if (created?.id) {
          navigate(`/roles/${created.id}`);
          return;
        }
      }

      // Refresh current session roleDetails so updated permissions apply immediately
      try {
        const profile = await fetchUserProfile();
        if (profile && (profile as any).roleDetails) {
          dispatch(setRoleDetails((profile as any).roleDetails));
          localStorage.setItem('roleDetails', JSON.stringify((profile as any).roleDetails));
        }
      } catch (profileErr) {
        console.warn('Could not refresh user roleDetails after role update:', profileErr);
      }

      navigate('/roles');
    } catch (err: any) {
      console.error('Save role failed:', err);
      errorToast(err.response?.data?.error || err.message || 'Failed to save role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (formikRef.current) {
      const formErrors = await formikRef.current.validateForm();
      if (Object.keys(formErrors).length > 0) {
        Object.keys(formErrors).forEach(field => {
          formikRef.current?.setFieldTouched(field, true, true);
        });
        errorToast('Please resolve validation errors before saving');
        return;
      }
      await formikRef.current.submitForm();
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm(`Are you sure you want to delete role "${formState.name}"?`)) return;
    try {
      await deleteRole(id);
      successToast('Role deleted successfully');
      navigate('/roles');
    } catch (err: any) {
      errorToast('Failed to delete role');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm font-semibold">Loading role & permissions...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      breadcrumb={
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <button onClick={() => navigate('/roles')} className="hover:text-emerald-700 hover:underline cursor-pointer">
            Role Management
          </button>
          <span>/</span>
          <span className="text-gray-900 font-semibold">{isEditMode ? formState.name || 'Edit Role' : 'Add Role'}</span>
        </div>
      }
    >
      <div className="flex flex-col min-h-full bg-gray-50/50 font-sans pb-16">
        
        {/* Page Top Header */}
        <ERPFormHeader
          title={isEditMode ? formState.name || 'Edit Role' : 'Add Role'}
          onBack={() => navigate('/roles')}
          backTitle="Back to Roles"
          statusBadge={{
            label: formState.status,
            variant: formState.status === 'Active' ? 'success' : 'gray'
          }}
          extraBadges={[
            {
              label: `${selectedPermissionsCount} / ${totalPermissionsCount} Permissions`,
              variant: selectedPermissionsCount > 0 ? 'success' : 'gray'
            }
          ]}
          onSave={handleSave}
          isSubmitting={submitting}
          saveLabel={isEditMode ? 'Save Changes' : 'Add Role'}
          moreMenuItems={[
            ...(isEditMode ? [
              {
                label: 'Copy Role Code',
                onClick: () => {
                  navigator.clipboard.writeText(formState.code);
                  successToast('Role code copied to clipboard');
                },
                icon: <Copy className="w-4 h-4 text-gray-500" />
              },
              {
                label: 'Delete Role',
                onClick: handleDelete,
                icon: <Trash2 className="w-4 h-4 text-red-600" />,
                danger: true
              }
            ] : []),
            {
              label: 'Back to Role List',
              onClick: () => navigate('/roles')
            }
          ]}
        />

        {/* Main Content Form */}
        <Formik
          innerRef={formikRef}
          initialValues={formState}
          validationSchema={roleValidationSchema}
          onSubmit={handleFormikSubmit}
          enableReinitialize
        >
          {({ values, errors, touched, handleChange, handleBlur, setFieldValue }) => (
            <Form className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-5 space-y-6">
              
              {/* Section 1: Role Details Card */}
              <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-5">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase">
                        Role Information
                      </h3>
                      <p className="text-[11px] text-gray-400">
                        Define the role identity, assigned naming and account access status
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400">* Required fields</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Role Name */}
                  <TextFieldComponent
                    name="name"
                    label="Role Name *"
                    required
                    placeholder="e.g. Store Manager, QC Inspector"
                    value={values.name}
                    error={Boolean(touched.name && errors.name)}
                    helperText={touched.name && errors.name ? String(errors.name) : ''}
                    onBlur={handleBlur}
                    onChange={(e: any) => {
                      handleChange(e);
                      const val = e.target.value;
                      const autoCode = val.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
                      setFormState(prev => ({
                        ...prev,
                        name: val,
                        code: isEditMode && prev.code ? prev.code : autoCode
                      }));
                      if (!isEditMode || !values.code) {
                        setFieldValue('code', autoCode);
                      }
                    }}
                  />

                  {/* Role Code */}
                  <TextFieldComponent
                    name="code"
                    label="Role Code"
                    placeholder="e.g. STORE_MANAGER"
                    value={values.code}
                    onBlur={handleBlur}
                    onChange={(e: any) => {
                      handleChange(e);
                      setFormState(prev => ({ ...prev, code: e.target.value.toUpperCase() }));
                    }}
                  />

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={values.status}
                      onBlur={handleBlur}
                      onChange={(e) => {
                        handleChange(e);
                        setFormState(prev => ({ ...prev, status: e.target.value as 'Active' | 'Inactive' }));
                      }}
                      className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white font-medium min-h-[42px]"
                    >
                      <option value="Active">Active (Permits logins & permissions)</option>
                      <option value="Inactive">Inactive (Suspends access)</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-3">
                    <TextFieldComponent
                      name="description"
                      label="Description"
                      multiline
                      rows={2}
                      placeholder="Outline the scope of duties, authority and responsibilities for this role..."
                      value={values.description}
                      onBlur={handleBlur}
                      onChange={(e: any) => {
                        handleChange(e);
                        setFormState(prev => ({ ...prev, description: e.target.value }));
                      }}
                    />
                  </div>
                </div>
              </div>

          {/* Section 2: Role Permissions Card (Exact Reference Image Design) */}
          <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-6">
            
            {/* Header with Title & Quick Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                  Role Permissions
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Assign granular functional and operational permissions to this role
                </p>
              </div>

              {/* Search Box */}
              <div className="flex items-center gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search module or action..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50 focus:bg-white transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Category filter pills if multiple categories */}
            {categories.length > 2 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Filter:
                </span>
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Table / Permissions Grid */}
            <div className="overflow-x-auto border border-gray-200/90 rounded-2xl shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-700">
                    <th className="py-4 px-6 font-bold uppercase tracking-wider text-xs sm:text-sm w-72 min-w-[220px]">
                      Module / Functionality
                    </th>
                    <th className="py-4 px-6 font-bold uppercase tracking-wider text-xs sm:text-sm">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <span className="text-gray-900 font-bold">Permissions</span>
                        
                        {/* Administrator Access - Compact Select All */}
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-gray-600 normal-case tracking-normal text-xs sm:text-sm">
                            Administrator Access:
                          </span>
                          <label
                            onClick={(e) => {
                              e.preventDefault();
                              handleToggleSelectAll();
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1 bg-white hover:bg-emerald-50/50 rounded-lg border border-gray-300 hover:border-emerald-500 text-xs font-bold uppercase tracking-wider text-gray-700 hover:text-emerald-700 transition-all cursor-pointer shadow-2xs select-none"
                          >
                            <span className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              isAllSelected 
                                ? 'bg-emerald-600 border-emerald-600 text-white' 
                                : 'border-gray-300 bg-white hover:border-emerald-500'
                            }`}>
                              {isAllSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </span>
                            <span>SELECT ALL</span>
                          </label>
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredModules.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-12 text-center text-gray-400 text-sm font-medium">
                        No modules match your search filter
                      </td>
                    </tr>
                  ) : (
                    filteredModules.map((item) => {
                      const allChecked = isModuleAllChecked(item);

                      return (
                        <tr 
                          key={item.id} 
                          className="hover:bg-gray-50/60 transition-colors group"
                        >
                          {/* Module Name & Quick Toggle */}
                          <td className="py-4 px-6 align-top">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-gray-900 text-sm">
                                  {item.name}
                                </span>
                              </div>
                              {item.category && (
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-500 uppercase tracking-wider">
                                  {item.category}
                                </span>
                              )}
                              <div>
                                <button
                                  type="button"
                                  onClick={() => handleToggleModuleAll(item)}
                                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer select-none"
                                >
                                  {allChecked ? 'Deselect module' : 'Select all'}
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Permissions Checkbox - Clean without background or border */}
                          <td className="py-4 px-6 align-top">
                            <div className="flex flex-wrap items-center gap-x-7 gap-y-3 pt-0.5">
                              {item.moduleDetail?.map((perm) => {
                                const checked = isPermissionChecked(item.id, perm.id);

                                return (
                                  <label
                                    key={perm.id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handlePermissionChange(item.id, perm.id, !checked);
                                    }}
                                    className="inline-flex items-center gap-2 select-none cursor-pointer py-0.5 group/item transition-colors"
                                  >
                                    <span className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                                      checked
                                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                                        : 'border-gray-300 bg-white group-hover/item:border-emerald-500'
                                    }`}>
                                      {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                    </span>
                                    <span className={`text-xs sm:text-sm leading-snug transition-colors ${
                                      checked ? 'font-semibold text-gray-900' : 'font-medium text-gray-600 group-hover/item:text-gray-900'
                                    }`}>
                                      {perm.name}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Form Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                <span className="font-bold text-gray-800">{selectedPermissionsCount}</span> of <span className="font-bold text-gray-800">{totalPermissionsCount}</span> permissions granted
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/roles')}
                  className="px-5 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isEditMode ? 'Save Changes' : 'Add Role'}</span>
                </button>
              </div>
            </div>

          </div>

            </Form>
          )}
        </Formik>

      </div>
    </DashboardLayout>
  );
};

export const RoleFormPage = WithAuth(RoleFormPageBase, ModuleName.ROLE_PERMISSIONS, Permission.ADD);
export default RoleFormPage;

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { ERPFormHeader, ERPFormPageLayout } from '../../components/ERPForm';
import { FormCommentsAndActivity, triggerActivityRefresh } from '../../components/FormCommentsAndActivity';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { useSelector } from 'react-redux';
import { 
  fetchPartOfById, 
  createPartOf, 
  updatePartOf,
  type PartOf 
} from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { TextFieldComponent } from '../../components/input/index';
import { 
  Paperclip, 
  UserPlus, 
  Tag, 
  Loader2, 
  Share2, 
  Layers 
} from 'lucide-react';

const partOfValidationSchema = Yup.object({
  name: Yup.string().trim().required('Part Of Name is required'),
  disabled: Yup.boolean()
});

const PartOfFormPageBase: React.FC = () => {
  const { user } = useSelector((state: any) => state.base);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id && id !== 'new');

  const [loading, setLoading] = useState(isEditMode);
  const [assignedTo, setAssignedTo] = useState(user?.name || user?.username || 'Administrator');
  const [tags, setTags] = useState<string[]>(['PART OF']);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);

  const formikRef = useRef<any>(null);

  const [initialValues, setInitialValues] = useState<{
    id?: string | number;
    name: string;
    disabled: boolean;
  }>({
    name: '',
    disabled: false
  });

  useEffect(() => {
    if (id && id !== 'new') {
      loadPartOf(id);
    }
  }, [id]);

  const loadPartOf = async (partId: string) => {
    setLoading(true);
    try {
      const data = await fetchPartOfById(partId);
      if (data) {
        setInitialValues({
          id: data.id,
          name: data.name || '',
          disabled: Boolean(data.disabled)
        });
      }
    } catch (err) {
      console.error('Failed to fetch Part Of details:', err);
      errorToast('Failed to load Part Of details');
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

  const handleSubmit = async (values: any, { setSubmitting, resetForm }: any) => {
    try {
      setSubmitting(true);
      const payload = {
        name: values.name.trim(),
        disabled: Boolean(values.disabled)
      };

      if (isEditMode && id) {
        const updated = await updatePartOf(id, payload);
        const newVals = {
          ...values,
          ...(updated || {}),
          name: updated?.name || values.name,
          disabled: Boolean(updated?.disabled ?? values.disabled)
        };
        setInitialValues(newVals);
        resetForm({ values: newVals });
        triggerActivityRefresh('PartOf', id);
        successToast('Part Of updated successfully');
      } else {
        const created = await createPartOf(payload);
        successToast('Part Of created successfully');
        if (created?.id) {
          triggerActivityRefresh('PartOf', created.id);
          navigate(`/master/part-of/${created.id}`);
        } else {
          navigate('/master/part-of');
        }
      }
    } catch (err: any) {
      console.error('Save Part Of error:', err);
      errorToast(err?.response?.data?.error || 'Failed to save Part Of');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full text-gray-500 text-sm gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
          <span>Loading Part Of details...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <Formik
      innerRef={formikRef}
      initialValues={initialValues}
      validationSchema={partOfValidationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ values, handleChange, handleBlur, setFieldValue, dirty, isSubmitting }) => (
        <ERPFormPageLayout
          recordCode={initialValues?.id ? `PARTOF-${initialValues.id}` : (isEditMode ? 'PARTOF-001' : undefined)}
          header={
            <ERPFormHeader
              title={values.name || 'Untitled Part Of'}
              onBack={() => navigate('/master/part-of')}
              backTitle="Back to Part Of List"
              statusBadge={{
                label: values.disabled ? 'Disabled' : 'Enabled',
                variant: values.disabled ? 'error' : 'blue'
              }}
              dirty={dirty || !isEditMode}
              onPrint={() => window.print()}
              moreMenuItems={[
                {
                  label: 'Copy Part Of Name',
                  onClick: () => {
                    navigator.clipboard.writeText(values.name);
                    successToast('Copied name to clipboard');
                  }
                },
                {
                  label: 'Back to Part Of List',
                  onClick: () => navigate('/master/part-of')
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
            />
          }
        >
          <Form noValidate className="space-y-6 w-full font-sans">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              
              {/* LEFT META SIDEBAR PANEL */}
              <div className="w-full lg:w-[280px] shrink-0 space-y-4">
                <div className="bg-white border border-gray-200/90 rounded-2xl p-5 space-y-4 shadow-2xs">
                  
                  {/* Assigned To */}
                  <div className="flex items-center justify-between text-xs py-1 border-b border-gray-100 pb-3">
                    <span className="text-gray-500 font-medium flex items-center gap-2">
                      <UserPlus className="w-3.5 h-3.5 text-gray-400" />
                      Assigned To
                    </span>
                    <span className="font-semibold text-emerald-700 hover:underline cursor-pointer">
                      {assignedTo}
                    </span>
                  </div>

                  {/* Attachments */}
                  <div className="space-y-2 py-1 border-b border-gray-100 pb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium flex items-center gap-2">
                        <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                        Attachments
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
                              successToast('Attachment uploaded');
                            }
                          };
                          input.click();
                        }}
                        className="text-emerald-700 font-semibold text-xs hover:underline cursor-pointer"
                      >
                        + Upload
                      </button>
                    </div>
                    {attachments.map((att, idx) => (
                      <div key={idx} className="text-xs text-gray-700 truncate font-medium bg-gray-50 p-1.5 rounded border border-gray-100">
                        {att.name}
                      </div>
                    ))}
                  </div>

                  {/* Tags */}
                  <div className="space-y-2 py-1 border-b border-gray-100 pb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-gray-400" />
                        Tags
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
                          placeholder="Tag name..."
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
                      Share
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        successToast('Link copied to clipboard');
                      }}
                      className="text-emerald-700 font-semibold text-xs hover:underline cursor-pointer"
                    >
                      Copy Link
                    </button>
                  </div>

                </div>
              </div>

              {/* RIGHT MAIN DETAILS CARD */}
              <div className="flex-1 w-full space-y-6">
                <div className="bg-white border border-gray-200/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-gray-900 tracking-tight">Part Of Details</h2>
                        <p className="text-xs text-gray-500">Configure Part Of master details</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <TextFieldComponent
                        name="name"
                        label="Part Of Name *"
                        placeholder="e.g. RAW MATERIAL, TOOLS, HARDWARE"
                        value={values.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </div>

                    <div className="flex items-center h-full pt-6">
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-700 select-none">
                        <input
                          type="checkbox"
                          name="disabled"
                          checked={values.disabled}
                          onChange={(e) => setFieldValue('disabled', e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>Disable Part Of</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* COMMENTS & ACTIVITY TIMELINE COMPONENT BELOW FORM */}
            {/* <FormCommentsAndActivity
              entityType="PartOf"
              entityId={id && id !== 'new' ? id : (initialValues.id ? String(initialValues.id) : '')}
              createdByName={user?.name || user?.username || 'Admin'}
              createdAt="recently"
              lastEditedByName={user?.name || user?.username || 'Admin'}
              lastEditedAt="recently"
              currentUser={{ name: user?.name || user?.username || 'Admin' }}
              className="mt-6"
            /> */}
          </Form>
        </ERPFormPageLayout>
      )}
    </Formik>
  );
};

export const PartOfFormPage = WithAuth(PartOfFormPageBase, ModuleName.PART_OF, Permission.ADD);
export default PartOfFormPage;

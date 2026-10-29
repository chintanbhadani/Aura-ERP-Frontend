import dataService from '../axios/dataService';

export interface InquiryDTO {
  id?: string;
  inquiryNumber?: string;
  clientId?: number | string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  requirements: string;
  strapType?: string;
  strapSize?: string;
  color?: string;
  surfaceFinish?: string;
  coreSize?: string;
  sizeInTons: number;
  quotedPrice: number;
  totalEstimatedValue?: number;
  status: 'Open' | 'Quoted' | 'Won' | 'Lost' | 'Under Review';
  deliveryDate?: string;
  assignedRep?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

const STORAGE_KEY = 'erp_crm_inquiries';

export const getStoredInquiries = (): InquiryDTO[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading inquiries from localStorage', err);
  }
  return [];
};

export const saveStoredInquiries = (inquiries: InquiryDTO[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inquiries));
  } catch (err) {
    console.error('Error saving inquiries to localStorage', err);
  }
};

export const fetchInquiries = async (): Promise<InquiryDTO[]> => {
  try {
    const res = await dataService.get('/inquiries');
    if (Array.isArray(res.data) && res.data.length > 0) {
      // Map Prisma Inquiry to InquiryDTO
      const backendInquiries: InquiryDTO[] = res.data.map((item: any, idx: number) => ({
        id: item.id,
        inquiryNumber: item.inquiryNumber || `INQ-${new Date(item.createdAt || Date.now()).getFullYear()}-${String(idx + 1).padStart(3, '0')}`,
        clientId: item.clientId,
        clientName: item.client?.companyName || item.clientName || 'Unknown Client',
        clientEmail: item.client?.email,
        clientPhone: item.client?.phone,
        requirements: item.requirements || 'PET Strap Specification',
        sizeInTons: Number(item.sizeInTons || 0),
        quotedPrice: Number(item.quotedPrice || 0),
        totalEstimatedValue: Number(item.sizeInTons || 0) * 1000 * Number(item.quotedPrice || 0),
        status: (item.status === 'UNDER_REVIEW' ? 'Under Review' : 
                 item.status === 'OPEN' ? 'Open' :
                 item.status === 'QUOTED' ? 'Quoted' :
                 item.status === 'WON' ? 'Won' :
                 item.status === 'LOST' ? 'Lost' : item.status) || 'Open',
        assignedRep: item.client?.assignedRep?.username || 'Administrator',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt
      }));
      // Merge with stored local inquiries
      const stored = getStoredInquiries();
      const mergedMap = new Map<string, InquiryDTO>();
      stored.forEach(i => mergedMap.set(i.id || i.inquiryNumber || '', i));
      backendInquiries.forEach(i => mergedMap.set(i.id || i.inquiryNumber || '', i));
      const merged = Array.from(mergedMap.values());
      saveStoredInquiries(merged);
      return merged;
    }
  } catch (error) {
    console.warn('API /inquiries failed, falling back to localStorage cache:', error);
  }
  return getStoredInquiries();
};

export const fetchInquiryById = async (id: string): Promise<InquiryDTO | null> => {
  // Check local cache first
  const stored = getStoredInquiries();
  const localMatch = stored.find(i => i.id === id || i.inquiryNumber === id);

  try {
    const res = await dataService.get(`/inquiries/${id}`);
    if (res.data) {
      const item = res.data;
      return {
        id: item.id,
        inquiryNumber: item.inquiryNumber || localMatch?.inquiryNumber || `INQ-${id.slice(0, 8)}`,
        clientId: item.clientId,
        clientName: item.client?.companyName || localMatch?.clientName || 'Unknown Client',
        clientEmail: item.client?.email || localMatch?.clientEmail,
        clientPhone: item.client?.phone || localMatch?.clientPhone,
        requirements: item.requirements || localMatch?.requirements || '',
        strapType: localMatch?.strapType,
        strapSize: localMatch?.strapSize,
        color: localMatch?.color,
        surfaceFinish: localMatch?.surfaceFinish,
        coreSize: localMatch?.coreSize,
        sizeInTons: Number(item.sizeInTons ?? localMatch?.sizeInTons ?? 0),
        quotedPrice: Number(item.quotedPrice ?? localMatch?.quotedPrice ?? 0),
        totalEstimatedValue: Number(item.sizeInTons ?? localMatch?.sizeInTons ?? 0) * 1000 * Number(item.quotedPrice ?? localMatch?.quotedPrice ?? 0),
        status: (item.status === 'UNDER_REVIEW' ? 'Under Review' : 
                 item.status === 'OPEN' ? 'Open' :
                 item.status === 'QUOTED' ? 'Quoted' :
                 item.status === 'WON' ? 'Won' :
                 item.status === 'LOST' ? 'Lost' : item.status) || localMatch?.status || 'Open',
        deliveryDate: localMatch?.deliveryDate,
        assignedRep: item.client?.assignedRep?.username || localMatch?.assignedRep || 'Administrator',
        notes: localMatch?.notes,
        createdAt: item.createdAt || localMatch?.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt
      };
    }
  } catch (error) {
    console.warn(`API /inquiries/${id} failed, returning local match:`, error);
  }

  return localMatch || null;
};

export const createInquiry = async (data: Partial<InquiryDTO>): Promise<InquiryDTO> => {
  const stored = getStoredInquiries();
  const nextNum = stored.length + 1;
  const inquiryNumber = data.inquiryNumber || `INQ-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;
  const localId = `inq-${Date.now()}`;

  const record: InquiryDTO = {
    id: localId,
    inquiryNumber,
    clientId: data.clientId,
    clientName: data.clientName || 'Unknown Client',
    clientEmail: data.clientEmail || '',
    clientPhone: data.clientPhone || '',
    requirements: data.requirements || '',
    strapType: data.strapType || '',
    strapSize: data.strapSize || '',
    color: data.color || '',
    surfaceFinish: data.surfaceFinish || '',
    coreSize: data.coreSize || '',
    sizeInTons: Number(data.sizeInTons || 0),
    quotedPrice: Number(data.quotedPrice || 0),
    totalEstimatedValue: Number(data.sizeInTons || 0) * 1000 * Number(data.quotedPrice || 0),
    status: data.status || 'Open',
    deliveryDate: data.deliveryDate || '',
    assignedRep: data.assignedRep || 'Administrator',
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const res = await dataService.post('/inquiries', {
      clientId: data.clientId,
      clientName: data.clientName,
      sizeInTons: data.sizeInTons,
      quotedPrice: data.quotedPrice,
      status: (data.status || 'OPEN').toUpperCase().replace(/\s+/g, '_')
    });
    if (res.data?.id) {
      record.id = res.data.id;
    }
  } catch (err) {
    console.warn('Backend inquiry create failed, storing locally:', err);
  }

  saveStoredInquiries([record, ...stored]);
  return record;
};

export const updateInquiry = async (id: string, data: Partial<InquiryDTO>): Promise<InquiryDTO> => {
  const stored = getStoredInquiries();
  const existingIdx = stored.findIndex(i => i.id === id || i.inquiryNumber === id);

  const updatedRecord: InquiryDTO = {
    ...(existingIdx >= 0 ? stored[existingIdx] : {}),
    ...data,
    id: id,
    totalEstimatedValue: Number(data.sizeInTons ?? stored[existingIdx]?.sizeInTons ?? 0) * 1000 * Number(data.quotedPrice ?? stored[existingIdx]?.quotedPrice ?? 0),
    updatedAt: new Date().toISOString()
  } as InquiryDTO;

  try {
    await dataService.put(`/inquiries/${id}`, {
      clientId: data.clientId,
      sizeInTons: data.sizeInTons,
      quotedPrice: data.quotedPrice,
      status: (data.status || 'OPEN').toUpperCase().replace(/\s+/g, '_')
    });
  } catch (err) {
    console.warn(`Backend inquiry update ${id} failed:`, err);
  }

  if (existingIdx >= 0) {
    stored[existingIdx] = updatedRecord;
    saveStoredInquiries([...stored]);
  } else {
    saveStoredInquiries([updatedRecord, ...stored]);
  }

  return updatedRecord;
};

export const deleteInquiry = async (id: string): Promise<boolean> => {
  try {
    await dataService.delete(`/inquiries/${id}`);
  } catch (err) {
    console.warn(`Backend inquiry delete ${id} failed:`, err);
  }

  const stored = getStoredInquiries();
  saveStoredInquiries(stored.filter(i => i.id !== id && i.inquiryNumber !== id));
  return true;
};

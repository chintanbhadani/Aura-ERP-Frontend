export interface Property {
  _id: string;
  cityId: string;
  userId: string;
  price: number;
  isActive: boolean;
  images: string[];
  description: string;
  title: string;
  address: string;
  poster: string;
  lat?: string;
  lng?: string;
}

import { api } from '@/lib/api';

export type UpdateProfileRecord = {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  preferredName?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  profileImageUrl?: string;
  email?: string;
  phoneNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  suburb?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
};

class ProfileService {
  async update(dto: UpdateProfileRecord) {
    const { data } = await api.patch('/profile-record', dto);
    return data.data;
  }
}

export const profileService = new ProfileService();

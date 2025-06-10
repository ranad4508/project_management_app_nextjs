import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../index";

interface UpdateProfileData {
  name?: string;
  bio?: string;
  phone?: string;
  location?: string;
  timezone?: string;
  language?: string;
}

interface UpdateSettingsData {
  theme?: "light" | "dark" | "system";
  emailNotifications?: boolean;
  pushNotifications?: boolean;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

interface EnableMFAResponse {
  secret: string;
  qrCode: string;
  message: string;
}

interface VerifyMFAData {
  code: string;
}

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api/user",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["User"],
  endpoints: (builder) => ({
    getProfile: builder.query<any, void>({
      query: () => "/profile",
      providesTags: ["User"],
    }),
    updateProfile: builder.mutation<any, UpdateProfileData>({
      query: (data) => ({
        url: "/profile",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),
    updateSettings: builder.mutation<any, UpdateSettingsData>({
      query: (data) => ({
        url: "/settings",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),
    changePassword: builder.mutation<any, ChangePasswordData>({
      query: (data) => ({
        url: "/change-password",
        method: "PUT",
        body: data,
      }),
    }),
    uploadAvatar: builder.mutation<any, FormData>({
      query: (formData) => ({
        url: "/avatar",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["User"],
    }),
    enableMFA: builder.mutation<EnableMFAResponse, void>({
      query: () => ({
        url: "/mfa/enable",
        method: "POST",
      }),
    }),
    verifyMFA: builder.mutation<any, VerifyMFAData>({
      query: (data) => ({
        url: "/mfa/verify",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),
    disableMFA: builder.mutation<any, { password: string }>({
      query: (data) => ({
        url: "/mfa/disable",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useUpdateSettingsMutation,
  useChangePasswordMutation,
  useUploadAvatarMutation,
  useEnableMFAMutation,
  useVerifyMFAMutation,
  useDisableMFAMutation,
} = userApi;

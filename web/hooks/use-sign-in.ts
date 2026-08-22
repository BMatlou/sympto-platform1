import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { SignInRequest } from "@/types/auth";

export function useSignIn() {
  return useMutation({
    mutationFn: (data: SignInRequest) =>
      authService.signIn(data),
  });
}
import { useMutation } from "@tanstack/react-query";

import { authService } from "@/services/auth.service";
import { SignUpSchema } from "@/schemas/auth.schema";

export function useSignUp() {
  return useMutation({
    mutationFn: (data: SignUpSchema) => authService.signUp(data),
  });
}
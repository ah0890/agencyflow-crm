"use client";

import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SelectInput, TextInput } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import {
  changePasswordSchema,
  updateProfileSchema,
} from "@/lib/validation/schemas";
import { USER_ROLES } from "@/lib/constants";
import { useResourceMutation } from "@/lib/hooks/useResourceMutation";
import { cn } from "@/lib/utils";

type ProfileValues = z.input<typeof updateProfileSchema>;
type PasswordValues = z.input<typeof changePasswordSchema>;

const AVATAR_COLORS = [
  "#6366f1",
  "#06b6d4",
  "#a855f7",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

/**
 * Profile and password.
 *
 * Both write through /api/profile, which is authenticated by cookie - the user
 * id is never taken from the request body, so one signed-in user cannot edit
 * another's record.
 */
export function ProfileSettings({
  user,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    jobTitle: string | null;
    avatarColor: string;
  };
}) {
  const profile = useResourceMutation<ProfileValues>();
  const password = useResourceMutation<PasswordValues>();

  const profileForm = useForm({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      jobTitle: user.jobTitle ?? "",
      avatarColor: user.avatarColor,
      role: user.role,
    } as ProfileValues,
  });

  const passwordForm = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // useWatch subscribes to a single field and is safe to memoize, unlike the
  // watch() function returned from useForm.
  const watchedColor = useWatch({
    control: profileForm.control,
    name: "avatarColor",
  });
  const watchedName = useWatch({ control: profileForm.control, name: "name" });

  const selectedColor = watchedColor ?? user.avatarColor;
  const displayName = watchedName || user.name;

  const onSaveProfile = profileForm.handleSubmit(async (values) => {
    await profile.run({
      path: "/api/profile",
      method: "PATCH",
      body: values,
      successMessage: "Profile updated",
      setError: profileForm.setError,
    });
  });

  const onChangePassword = passwordForm.handleSubmit(async (values) => {
    const result = await password.run({
      path: "/api/profile/password",
      method: "POST",
      body: values,
      successMessage: "Password changed",
      setError: passwordForm.setError,
    });
    if (result) passwordForm.reset();
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Profile"
          description="How you appear to the rest of the team."
        />
        <CardBody>
          <form onSubmit={onSaveProfile} className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar
                name={displayName}
                color={String(selectedColor)}
                size="lg"
              />
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">
                  Avatar colour
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Use ${color}`}
                      aria-pressed={selectedColor === color}
                      onClick={() =>
                        profileForm.setValue("avatarColor", color, {
                          shouldDirty: true,
                        })
                      }
                      className={cn(
                        "size-7 rounded-full border-2 transition-transform hover:scale-110",
                        selectedColor === color
                          ? "border-[var(--text)]"
                          : "border-transparent",
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput
                label="Full name"
                required
                error={profileForm.formState.errors.name?.message}
                {...profileForm.register("name")}
              />
              <TextInput
                label="Email address"
                type="email"
                required
                hint="This is also your sign-in email."
                error={profileForm.formState.errors.email?.message}
                {...profileForm.register("email")}
              />
              <TextInput
                label="Job title"
                placeholder="Head of New Business"
                error={profileForm.formState.errors.jobTitle?.message}
                {...profileForm.register("jobTitle")}
              />
              <SelectInput
                label="Role"
                options={USER_ROLES.map((r) => ({
                  value: r.value,
                  label: r.label,
                }))}
                error={profileForm.formState.errors.role?.message}
                {...profileForm.register("role")}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={profile.pending}>
                Save profile
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Password"
          description="Passwords are stored as bcrypt hashes, never in plain text."
        />
        <CardBody>
          <form onSubmit={onChangePassword} className="space-y-4">
            <TextInput
              label="Current password"
              type="password"
              autoComplete="current-password"
              required
              className="max-w-sm"
              error={passwordForm.formState.errors.currentPassword?.message}
              {...passwordForm.register("currentPassword")}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput
                label="New password"
                type="password"
                autoComplete="new-password"
                required
                hint="At least 8 characters."
                error={passwordForm.formState.errors.newPassword?.message}
                {...passwordForm.register("newPassword")}
              />
              <TextInput
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                required
                error={passwordForm.formState.errors.confirmPassword?.message}
                {...passwordForm.register("confirmPassword")}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="secondary"
                loading={password.pending}
              >
                Change password
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

<script setup lang="ts">
import { computed, ref } from 'vue'
import PasswordInput from '~/components/auth/PasswordInput.vue'
import { errorMessage, useApi } from '~/composables/useApi'
import { forgetUploadKey } from '~/composables/useFileUploader'
import useNotification from '~/composables/useNotification'
import { NotificationType } from '~/types/notification'
import { assertSupportedEncryption, deriveMasterKeyBytes, toBase64 } from '~/utils/uploadCrypto'

const MIN_PASSWORD = 8

useHead({ title: 'Account' })

const auth = useAuthStore()
const { notify } = useNotification()

// ---------- Account password ----------
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const savingPassword = ref(false)

const passwordMismatch = computed(
  () => confirmPassword.value.length > 0 && confirmPassword.value !== newPassword.value
)
const canChangePassword = computed(
  () =>
    !savingPassword.value &&
    currentPassword.value.length > 0 &&
    newPassword.value.length >= MIN_PASSWORD &&
    newPassword.value === confirmPassword.value
)

async function changePassword() {
  if (!canChangePassword.value) return
  passwordError.value = ''
  savingPassword.value = true
  try {
    await auth.changePassword(currentPassword.value, newPassword.value)
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    notify({
      type: NotificationType.INFO,
      message: 'Password changed, other devices were signed out'
    })
  } catch (err) {
    passwordError.value = errorMessage(err, 'The password was not changed')
  } finally {
    savingPassword.value = false
  }
}

// ---------- Upload password ----------
const uploadPassword = ref('')
const uploadConfirm = ref('')
const uploadError = ref('')
const savingUploadKey = ref(false)

const uploadMismatch = computed(
  () => uploadConfirm.value.length > 0 && uploadConfirm.value !== uploadPassword.value
)
const canSaveUploadKey = computed(
  () =>
    !savingUploadKey.value &&
    uploadPassword.value.length >= MIN_PASSWORD &&
    uploadPassword.value === uploadConfirm.value
)

async function saveUploadPassword() {
  if (!canSaveUploadKey.value) return
  uploadError.value = ''
  savingUploadKey.value = true
  try {
    const cfg = await useApi().get<UploadConfigRs>('/files/uploads/config', undefined, {
      silent: true
    })
    assertSupportedEncryption(cfg.encryption)
    // the password never leaves the browser: only the PBKDF2 result is sent, once, right now
    const key = await deriveMasterKeyBytes(uploadPassword.value, cfg.encryption)
    try {
      await auth.setUploadKey(toBase64(key))
    } finally {
      key.fill(0)
    }
    uploadPassword.value = ''
    uploadConfirm.value = ''
    forgetUploadKey()
    notify({ type: NotificationType.INFO, message: 'Upload password saved' })
  } catch (err) {
    uploadError.value = errorMessage(err, 'The upload password was not saved')
  } finally {
    savingUploadKey.value = false
  }
}

// ---------- Session ----------
const signingOut = ref(false)

async function signOut() {
  signingOut.value = true
  await auth.logout()
}
</script>

<template>
  <LayoutWrapper title="Account" narrow>
    <div class="account">
      <section class="account__block" aria-label="Profile">
        <div class="ui-section-label">Profile</div>
        <div class="ui-group">
          <div class="ui-group-row account__profile">
            <span class="account__avatar">{{ auth.user?.email.charAt(0).toUpperCase() }}</span>
            <span class="account__profile-text">
              <span class="account__email">{{ auth.user?.email }}</span>
              <span class="account__meta"
                >Chats, spaces, files, prompts and models of this account</span
              >
            </span>
            <button
              type="button"
              class="ui-btn ui-btn--danger ui-btn--sm"
              :disabled="signingOut"
              @click="signOut"
            >
              <Icon name="lucide:log-out" />
              Sign out
            </button>
          </div>
        </div>
      </section>

      <form class="account__block" aria-label="Password" @submit.prevent="changePassword">
        <div class="ui-section-label">Password</div>
        <div class="account__card">
          <label class="account__field">
            <span class="account__label">Current password</span>
            <PasswordInput v-model="currentPassword" autocomplete="current-password" />
          </label>
          <div class="account__row">
            <label class="account__field">
              <span class="account__label">New password</span>
              <PasswordInput
                v-model="newPassword"
                autocomplete="new-password"
                :placeholder="`At least ${MIN_PASSWORD} characters`"
              />
            </label>
            <label class="account__field">
              <span class="account__label">Confirm new password</span>
              <PasswordInput
                v-model="confirmPassword"
                autocomplete="new-password"
                placeholder="Repeat"
              />
            </label>
          </div>
          <p v-if="passwordMismatch" class="account__warn">Passwords do not match</p>
          <p v-if="passwordError" class="account__error" role="alert">{{ passwordError }}</p>
          <div class="account__actions">
            <button type="submit" class="ui-btn ui-btn--primary" :disabled="!canChangePassword">
              <Icon v-if="savingPassword" name="lucide:loader-circle" class="animate-spin" />
              Change password
            </button>
            <span class="ui-hint">Other devices will be signed out.</span>
          </div>
        </div>
      </form>

      <form
        class="account__block"
        aria-label="Upload password"
        @submit.prevent="saveUploadPassword"
      >
        <div class="account__label-row">
          <div class="ui-section-label">Upload password</div>
          <span v-if="auth.user?.uploadKeySet" class="ui-chip account__chip--ok">
            <Icon name="lucide:shield-check" /> Set
          </span>
          <span v-else class="ui-chip account__chip--warn">
            <Icon name="lucide:shield-alert" /> Not set
          </span>
        </div>
        <div class="account__card">
          <p class="account__intro">
            Folders are encrypted in your browser before they are uploaded to Files. The key is
            derived from this password; the password itself never leaves the browser, and uploads
            carry neither the password nor the key. You will be asked for it once per session when
            uploading.
          </p>
          <div class="account__row">
            <label class="account__field">
              <span class="account__label">
                {{ auth.user?.uploadKeySet ? 'New upload password' : 'Upload password' }}
              </span>
              <PasswordInput
                v-model="uploadPassword"
                autocomplete="new-password"
                :placeholder="`At least ${MIN_PASSWORD} characters`"
              />
            </label>
            <label class="account__field">
              <span class="account__label">Confirm</span>
              <PasswordInput
                v-model="uploadConfirm"
                autocomplete="new-password"
                placeholder="Repeat"
              />
            </label>
          </div>
          <p v-if="uploadMismatch" class="account__warn">Passwords do not match</p>
          <p v-if="uploadError" class="account__error" role="alert">{{ uploadError }}</p>
          <div class="account__actions">
            <button type="submit" class="ui-btn ui-btn--primary" :disabled="!canSaveUploadKey">
              <Icon v-if="savingUploadKey" name="lucide:loader-circle" class="animate-spin" />
              {{ auth.user?.uploadKeySet ? 'Change upload password' : 'Set upload password' }}
            </button>
            <span class="ui-hint">
              Files already uploaded stay available; unfinished uploads have to start again.
            </span>
          </div>
        </div>
      </form>
    </div>
  </LayoutWrapper>
</template>

<style scoped>
@import 'tailwindcss/theme';

.account {
  @apply flex flex-col gap-7;
}

.account__block {
  @apply flex flex-col gap-2;
}

.account__label-row {
  @apply flex items-center gap-2;
}

.account__profile {
  @apply min-h-16 py-3;
}

.account__avatar {
  @apply flex h-10 w-10 flex-none items-center justify-center rounded-full text-base font-semibold;
  background: linear-gradient(135deg, #0a84ff, #5e5ce6);
  color: #fff;
}

.account__profile-text {
  @apply flex min-w-0 flex-1 flex-col;
}

.account__email {
  @apply truncate text-[15px] font-medium;
  color: var(--c-text);
}

.account__meta {
  @apply truncate text-xs;
  color: var(--c-text-4);
}

.account__card {
  @apply flex flex-col gap-4 p-4;
  border-radius: var(--r-lg);
  background: var(--c-surface);
  border: 1px solid var(--c-sep);
}

.account__intro {
  @apply m-0 text-[13px] leading-relaxed;
  color: var(--c-text-3);
}

.account__row {
  @apply grid grid-cols-2 gap-3 max-sm:grid-cols-1;
}

.account__field {
  @apply flex min-w-0 flex-col gap-1.5;
}

.account__label {
  @apply px-0.5 text-[12.5px] font-medium;
  color: var(--c-text-3);
}

.account__actions {
  @apply flex flex-wrap items-center gap-3;
}

.account__warn {
  @apply m-0 -mt-2 px-0.5 text-xs;
  color: var(--c-warning);
}

.account__error {
  @apply m-0 rounded-[10px] px-3 py-2.5 text-[13px];
  background: var(--c-danger-soft);
  color: var(--c-danger);
}

.account__chip--ok {
  background: rgba(48, 209, 88, 0.14);
  color: var(--c-success);
}

.account__chip--warn {
  background: rgba(255, 214, 10, 0.12);
  color: var(--c-warning);
}
</style>

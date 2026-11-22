<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  url: string
  branch: string
  folder: string
  login: string
  password: string
  branches: string[]
  folders: string[]
  infoLoading?: boolean
  infoLoaded?: boolean
  infoError?: string
  infoSummary?: string
  disabled?: boolean
  canLoadInfo?: boolean
}>()

const emit = defineEmits<{
  'update:url': [value: string]
  'update:branch': [value: string]
  'update:folder': [value: string]
  'update:login': [value: string]
  'update:password': [value: string]
  'load-info': []
  'clear-folder': []
}>()

const hasFolders = computed(() => props.folders.length > 0)
</script>

<template>
  <div class="space-provider-panel">
    <label class="space-compact-field">
      <span class="space-compact-icon space-compact-icon--git">
        <Icon name="simple-icons:git" />
      </span>
      <input
        :value="props.url"
        type="url"
        placeholder="https://github.com/org/repo.git"
        class="space-compact-input"
        :disabled="props.disabled"
        @input="emit('update:url', ($event.target as HTMLInputElement).value)"
        @keyup.enter.exact="emit('load-info')"
      />
    </label>

    <div class="space-auth-card space-auth-card--optional">
      <div class="space-section-copy">
        <p class="space-section-title">Authentication</p>
        <p class="space-section-note">Optional for public repositories.</p>
      </div>

      <div class="space-field-grid">
        <label class="space-field">
          <span class="space-field-label">Login</span>
          <input
            :value="props.login"
            type="text"
            autocomplete="username"
            placeholder="Username"
            class="space-field-input"
            :disabled="props.disabled"
            @input="emit('update:login', ($event.target as HTMLInputElement).value)"
            @keyup.enter.exact="emit('load-info')"
          />
        </label>

        <label class="space-field">
          <span class="space-field-label">Password</span>
          <input
            :value="props.password"
            type="password"
            autocomplete="current-password"
            placeholder="Password or personal access token"
            class="space-field-input"
            :disabled="props.disabled"
            @input="emit('update:password', ($event.target as HTMLInputElement).value)"
            @keyup.enter.exact="emit('load-info')"
          />
        </label>
      </div>
    </div>

    <div class="space-git-toolbar">
      <button
        type="button"
        class="ui-btn ui-btn--secondary"
        :disabled="!props.canLoadInfo || props.infoLoading"
        @click="emit('load-info')"
      >
        <Icon
          :name="props.infoLoading ? 'lucide:loader-circle' : 'lucide:git-branch'"
          :class="{ 'animate-spin': props.infoLoading }"
        />
        {{ props.infoLoading ? 'Loading repository…' : 'Load branches and folders' }}
      </button>

      <p v-if="props.infoSummary" class="space-section-note">{{ props.infoSummary }}</p>
      <p v-else-if="props.infoError" class="space-status space-status--error">
        {{ props.infoError }}
      </p>
    </div>

    <div class="space-git-grid">
      <label class="space-field">
        <span class="space-field-label">Branch</span>
        <select
          :value="props.branch"
          class="space-field-input space-select"
          :disabled="props.disabled || props.infoLoading || !props.branches.length"
          @change="emit('update:branch', ($event.target as HTMLSelectElement).value)"
        >
          <option value="" disabled>
            {{
              props.infoLoading
                ? 'Loading branches...'
                : props.branches.length
                  ? 'Select branch'
                  : 'Load repository info first'
            }}
          </option>
          <option v-for="branchName in props.branches" :key="branchName" :value="branchName">
            {{ branchName }}
          </option>
        </select>
      </label>

      <div class="space-folder-field">
        <label class="space-field">
          <span class="space-field-label">Folder</span>
          <select
            :value="props.folder"
            class="space-field-input space-select"
            :disabled="props.disabled || props.infoLoading || !props.infoLoaded"
            @change="emit('update:folder', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">Repository root</option>
            <option v-for="folderPath in props.folders" :key="folderPath" :value="folderPath">
              {{ folderPath }}
            </option>
          </select>
        </label>

        <button
          v-if="props.folder"
          type="button"
          class="space-folder-clear"
          :disabled="props.disabled || props.infoLoading"
          aria-label="Clear selected folder"
          @click="emit('clear-folder')"
        >
          <Icon name="lucide:x" />
          <span>Clear</span>
        </button>
      </div>
    </div>

    <p v-if="props.infoLoaded && !hasFolders" class="space-section-note">
      Folder is optional. If you leave it empty, the backend will use the repository root.
    </p>
  </div>
</template>

<script>
export default {
  name: 'InformationPopup',
  props: {
    model: {
      type: Boolean,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    buttons: {
      type: Array,
      required: true,
    },
  },
  emits: [
    'submitForm',
  ],
  data () {
    return {
      valid: true,
    }
  },
  computed: {
    translatedTitle () {
      const tpl = this.$gettext('%{s}')
      return this.$gettextInterpolate(tpl, { s: this.title })
    },
  },
  methods: {
    isButtonDisabled (button) {
      return button.type === 'submit' && !this.valid
    },
    handleButtonClick (button) {
      if (button.event) {
        this.$emit(button.event, ...button.params || [])
      }
    },
    submitForm () {
      const button = this.buttons.find(btn => btn.type === 'submit') || {}
      this.$emit('submitForm', ...[this.valid, ...button.params || []])
    },
  },
}
</script>
<template>
  <v-dialog
    v-model="model"
    persistent
    width="30%"
  >
    <v-form
      v-model="valid"
      @submit.prevent="submitForm"
    >
      <v-card>
        <v-card-title class="header">
          <slot name="header">
            {{ translatedTitle }}
          </slot>
        </v-card-title>
        <v-card-text class="text">
          <slot />
        </v-card-text>
        <v-card-actions class="actions">
          <slot name="actions">
            <v-btn
              v-for="button in buttons"
              :key="button.label"
              :color="button.color"
              class="button"
              :disabled="isButtonDisabled(button)"
              :type="button.type || 'button'"
              @click="handleButtonClick(button)"
            >
              <v-icon
                small
                left
              >
                {{ button.icon }}
              </v-icon>
              {{ button.label }}
            </v-btn>
          </slot>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>
</template>
<style lang="scss" scoped>
.header {
  color: $secondary !important;
  padding: 20px 20px 40px 20px !important;
}
.text {
  color: $secondary !important;
  padding: 0 20px !important
}
.actions {
  color: $secondary !important;
  padding: 40px 20px 20px 20px !important;
  display: flex;
  justify-content: flex-end;
}
.button {
  margin-right: 20px;
  margin-left: 0 !important;
}
.button:last-child {
  margin-right: 0;
}
</style>

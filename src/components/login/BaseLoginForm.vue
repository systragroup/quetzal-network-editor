<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Title',
  },
  body: {
    type: String,
    default: null,
  },
  confirmButton: {
    type: String,
    default: 'Apply',
  },
  error: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },

})
const emits = defineEmits(['confirm'])

const shake = ref(false)

async function confirm(event: any) {
  const resp = await event
  if (!resp.valid) {
    // set shake and then back to false. leave time for animation.
    shake.value = true
    setTimeout(() => { shake.value = false }, 500)
  } else {
    emits('confirm')
  }
}

</script>
<template>
  <v-card
    class="signin"
    :class="{'shake':shake}"
  >
    <v-card-title
      class="text-h4"
    >
      {{ props.title }}
    </v-card-title>
    <v-card-text
      class="text-h8"
      :style="{'padding-bottom':'0.5rem'}"
    >
      {{ props.body }}
    </v-card-text>
    <v-form
      ref="form"
      class="form"
      @submit.prevent="confirm"
    >
      <slot />
      <v-card-text :style="{color:'red'}">
        {{ props.error }}
      </v-card-text>
      <v-btn
        block
        type="submit"
        color="success"
        :loading="loading"
      >
        {{ props.confirmButton }}
      </v-btn>
      <slot
        name="append"
      />
    </v-form>
  </v-card>
</template>
<style lang="scss" scoped>
.form{
  margin: 1rem;
}
.signin {
  width:25rem;
  padding:1rem 2rem 2rem
}
.shake {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
  transform: translate3d(0, 0, 0);
}

@keyframes shake {
  10%, 90% {
    transform: translate3d(-1px, 0, 0);
  }
  20%, 80% {
    transform: translate3d(2px, 0, 0);
  }
  30%, 50%, 70% {
    transform: translate3d(-4px, 0, 0);
  }
  40%, 60% {
    transform: translate3d(4px, 0, 0);
  }
}

</style>

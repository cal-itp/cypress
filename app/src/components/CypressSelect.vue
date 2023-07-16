<template>
  <div>
    <input type="text" :name="name + '-textbox'" />
    <select :name="name + '-select'">
      <option v-for="option in options" :value="option.value" :key="option.value">
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<script>
export default {
  props: {
    name: {
      type: String,
      required: true,
    },
    options: {
      type: Array,
      required: true,
    },
  },
}
</script>
<template>
  <div :class="{ 'cypress-select': true, 'is-disabled': isDisabled }">
    <div class="unfocus-area" v-if="(waitingToFocus || isFocused)" @click="unfocus"></div>

    <input class="search-text" :disabled="isDisabled" v-if="(waitingToFocus || isFocused)" type="text" ref="searchTextInput" @keydown="keyboardControl" v-model="searchText">

    <div class="selection-display" v-if="!(waitingToFocus || isFocused)">
      <span class="selected-label" :tabindex="isDisabled ? '-1' : '0'" @click="focus" @focus="focus">
        {{ (selectedOption || placeholderOption).label }}
      </span>
      <button class="show-options" :disabled="isDisabled" v-if="!selectedOption" @click.prevent="focus" title="Show options">⏷</button>
      <button class="clear-selection" :disabled="isDisabled" v-if="selectedOption" @click.prevent="clearSelection" title="Clear selection">⮾</button>
    </div>

    <ul class="options" v-if="(waitingToFocus || isFocused)">
      <li :class="getOptionClasses(option)" v-for="option in filteredOptions" :key="option.key" :ref="'option-' + option.key" @click="selectOption(option)" @mouseover="highlightOption(option)">
        <div>
          {{ option.label }}
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  props: {
    name: {
      type: String,
      required: true,
    },
    placeholder: {
      type: String,
      required: false,
      default: '',
    },
    options: {
      type: Array,
      required: true,
    },
    disabled: {
      type: Boolean,
      required: false,
      default: false,
    },
    modelValue: {
      required: false,
      default: null,
    },
  },

  data() {
    return {
      searchText: '',
      isFocused: false,
      waitingToFocus: false,
      selectedOption: this.options.find((option) => option.value === this.modelValue),
      highlightedOption: null,
    };
  },

  computed: {
    placeholderOption() {
      return { label: this.placeholder, value: null };
    },

    isDisabled() {
      return this.disabled || this.disabled === '';
    },

    filteredOptions() {
      const lowerSearchText = this.searchText.toLowerCase();
      return this.options.filter((option) => {
        return option.label.toLowerCase().includes(lowerSearchText);
      })
      .sort((a, b) => {
        const aLowerLabel = a.label.toLowerCase();
        const bLowerLabel = b.label.toLowerCase();
        const atier = aLowerLabel.indexOf(lowerSearchText) === 0 ? 0 : 1;
        const btier = bLowerLabel.indexOf(lowerSearchText) === 0 ? 0 : 1;
        if (atier !== btier) {
          return atier - btier;
        } else {
          return aLowerLabel.localeCompare(bLowerLabel);
        }
      });
    },
  },

  updated() {
    if (this.waitingToFocus) {
      this.$refs.searchTextInput.focus();
      this.waitingToFocus = false;
      this.isFocused = true;
      this.highlightOption(this.selectedOption);
      console.log('focused')
    }
  },

  methods: {
    focus() {
      this.searchText = '';
      this.waitingToFocus = true;
      console.log('waiting to focus')
    },

    unfocus() {
      this.isFocused = false;
      this.waitingToFocus = false;
      console.log('unfocused')
    },

    selectOption(option) {
      this.selectedOption = option;
      console.log(`selected ${option.key}`)
      this.$emit('update:modelValue', option.value);
      this.$emit('change', option.value);
      this.unfocus();
    },

    highlightOption(option) {
      this.highlightedOption = option;
      if (option) {
        this.$refs['option-' + option.key][0].scrollIntoView({
          block: 'nearest',
          inline: 'nearest',
        });
      }
    },

    clearSelection() {
      this.selectedOption = null;
      this.$emit('update:modelValue', null);
      this.$emit('change', null);
    },

    keyboardControl(event) {
      function findOptionIndex(options, optionToSearch) {
        for (const [index, option] of options.entries()) {
          if (option.key === optionToSearch.key) {
            return index;
          }
        }
        return -1;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (this.highlightedOption) {
          const highlightedIndex = findOptionIndex(this.filteredOptions, this.highlightedOption);
          if (highlightedIndex < this.filteredOptions.length - 1) {
            this.highlightOption(this.filteredOptions[highlightedIndex + 1]);
          }
        } else {
          this.highlightOption(this.filteredOptions[0]);
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (this.highlightedOption) {
          const highlightedIndex = findOptionIndex(this.filteredOptions, this.highlightedOption);
          if (highlightedIndex > 0) {
            this.highlightOption(this.filteredOptions[highlightedIndex - 1]);
          }
        } else {
          this.highlightOption(this.filteredOptions[this.filteredOptions.length - 1]);
        }
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (this.highlightedOption) {
          this.selectOption(this.highlightedOption);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.unfocus();
      } else if (event.key === 'Tab') {
        this.unfocus();
      }
    },

    getOptionClasses(option) {
      return {
        option: true,
        selected: this.selectedOption && this.selectedOption.key === option.key,
        highlighted: this.highlightedOption && this.highlightedOption.key === option.key,
      };
    }
  },
}
</script>

<style scoped>
.cypress-select {
  position: relative;
}

.cypress-select.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.selection-display {
  display: flex;
  box-sizing: border-box;
  min-height: 1.5rem;
  width: 100%;
  padding: 0.25rem;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #888;
  border-radius: 4px;
  cursor: pointer;
}

.selected-label {
  display: block;
  min-height: 1rem;
  width: 100%;
  flex-grow: 1;
  font-size: 0.8rem;
}

.search-text {
  position: relative;
  box-sizing: border-box;
  height: 1.5rem;
  width: 100%;
  padding: 0.25rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.8rem;
  z-index: 1001;
}

.options {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  height: 10rem;
  overflow-y: auto;
  overflow-x: hidden;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid #ccc;
  border-top: none;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  background-color: #fff;
  z-index: 1001;
  font-size: 0.8rem;
}

.unfocus-area {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: calc(100%);
  z-index: 1000;
}

.option {
  background-color: transparent;
  width: 100%;
  padding: 0.25rem;
  cursor: pointer;
}

.option.highlighted {
  background-color: #ccc;
}

.option.selected {
  background-color: #48f;
  color: white;
}

.show-options,
.clear-selection {
  border: none;
  background-color: transparent;
  cursor: pointer;
}

.clear-selection {
  color: #c00;
}

.show-options:hover,
.clear-selection:hover {
  font-weight: bold;
}
</style>
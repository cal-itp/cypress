<template>
  <form>
    <fieldset class="grantee-info">
      <legend><h2>Which grant are you interested in?</h2></legend>

      <div class="field">
        <cypress-select name="grant" v-model="selectedGrant" :options="grantOptions" @change="handleGrantChange"></cypress-select>
      </div>
    </fieldset>

    <div class="additional-eligibility-details" v-if="!!selectedGrant && projectSpecificGrantCriteria.length > 0">
      <p>The following eligibility assumes:</p>
      <ul>
        <li v-for="criterion of projectSpecificGrantCriteria" :key="criterion.eligibility_code">
          {{ criterion.description }}

          <!-- E0008: Project Beneficiaries -->
          <span v-if="criterion.eligibility_code === 'e0008'">("{{ selectedGrant.eligibleProjectBeneficiaries.join('", "') }}")</span>

          <!-- E0009: Project Types -->
          <span v-if="criterion.eligibility_code === 'e0009'">("{{ selectedGrant.eligibleProjectTypes.map(t => t.type).join('", "') }}")</span>
        </li>
      </ul>
    </div>
  </form>
</template>

<script>
import CypressSelect from './CypressSelect.vue';

export default {
  props: {
    grants: {
      type: Array,
      required: true,
    },
    criteria: {
      type: Array,
      required: true,
    },
    modelValue: {
      type: Object,
      required: false,
    },
  },

  data() {
    return {
      selectedGrant: null,
    };
  },

  methods: {
    handleGrantChange() {
      console.log(this.selectedGrant)
      this.$emit('update:modelValue', this.selectedGrant);
    },
  },

  computed: {
    grantOptions() {
      return this.grants.map((grant) => ({
        label: grant.name,
        value: grant,
        key: grant.name,
      }));
    },

    projectSpecificGrantCriteria() {
      if (!this.selectedGrant) {
        return [];
      }

      const criteria = this.criteria
      .filter((criterion) => criterion.is_project_specific)
      .filter((criterion) => this.selectedGrant.eligibilityCriteria.includes(criterion.eligibility_code));

      console.log(this.criteria);
      console.log(this.selectedGrant.eligibilityCriteria);
      return criteria;
    }
  },

  components: {
    CypressSelect,
  },
}
</script>

<style scoped>
fieldset {
  border: none;
  padding: 0;
  padding-bottom: 1rem;
}

.field {
  width: 100%;
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.field label {
  width: 50%;
}

.field select,
.field .cypress-select {
  width: 50%;
  height: 1.5rem;
}

.field select[multiple] {
  height: auto;
}
</style>
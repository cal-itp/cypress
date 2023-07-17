<template>
  <form>
    <fieldset class="grantee-info">
      <legend><h2>Who is applying for the grant?</h2></legend>

      <div class="field">
        <label for="primary-applicant">Who is the primary applicant for the grant?</label>
        <cypress-select name="primary-applicant" v-model="primaryApplicantName" :options="customerOptions" @change="handleApplicantInfoChange"></cypress-select>
      </div>

      <div class="field">
        <label for="sub-applicant">Is there a sub-applicant?</label>
        <select name="sub-applicant" v-model="subApplicantName" @change="handleApplicantInfoChange">
          <option></option>
          <option v-for="customer in customerOptions" :value="customer.value" :key="customer.key">
            {{ customer.label }}
          </option>
        </select>
      </div>
    </fieldset>

    <fieldset class="project-info">
      <legend><h2>Tell us a little about the project...</h2></legend>

      <div class="field">
        <label for="project-type">What type of project is this?</label>
        <select name="project-type" v-model="applicantInfo.projectType">
          <option></option>
          <option v-for="projectType in []" :value="projectType.value" :key="projectType.key">
            {{ projectType.label }}
          </option>
        </select>
      </div>

      <div class="field">
        <label for="project-beneficiaries">Who will benefit from this project?</label>
        <select name="project-beneficiaries" multiple v-model="applicantInfo.projectBeneficiaries">
          <option></option>
          <option v-for="beneficiary in beneficiaryOptions" :value="beneficiary.value" :key="beneficiary.key">
            {{ beneficiary.label }}
          </option>
        </select>
      </div>
    </fieldset>
  </form>
</template>

<script>
import CypressSelect from './CypressSelect.vue';

export default {
  props: {
    customers: {
      type: Array,
      required: true,
    },
    beneficiaries: {
      type: Array,
      required: true,
    },
    modelValue: {
      type: Object,
      required: false,
      default: () => ({
        primaryApplicant: null,
        subApplicant: null,
        projectType: null,
        projectBeneficiaries: [],
      }),
      validator: (value) => {
        return (
          // projectBeneficiaries must be defined and an array
          value.projectBeneficiaries !== undefined &&
          Array.isArray(value.projectBeneficiaries)
        );
      },
    },
  },

  data() {
    return {
      primaryApplicantName: null,
      subApplicantName: null,
      applicantInfo: this.modelValue,
    };
  },

  methods: {
    handleApplicantInfoChange() {
      const newInfo = {
        primaryApplicant: this.customers.find((customer) => customer.name === this.primaryApplicantName),
        subApplicant: this.customers.find((customer) => customer.name === this.subApplicantName),
        projectType: this.applicantInfo.projectType,
        projectBeneficiaries: this.applicantInfo.projectBeneficiaries,
      };
      this.applicantInfo = newInfo;
      this.$emit('update:modelValue', this.applicantInfo);
    },
  },

  computed: {
    customerOptions() {
      return this.customers.map((customer) => ({
        label: customer.name,
        value: customer.name,
        key: customer.key,
      }));
    },

    beneficiaryOptions() {
      return this.beneficiaries.map((beneficiary) => ({
        label: beneficiary,
        value: beneficiary,
        key: beneficiary,
      }));
    },
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
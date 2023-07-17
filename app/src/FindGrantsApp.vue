<template>
  <header>
    <h1>Cypress - Find Grants</h1>
  </header>

  <main>
    <cypress-grants-form :customers="customers" :beneficiaries="beneficiaries" :projectTypes="projectTypes" v-model="applicantInfo"></cypress-grants-form>
    <cypress-grants-list :grants="grants" :applicant-info="applicantInfo"></cypress-grants-list>
  </main>
</template>

<script>
import CypressGrantsForm from './components/CypressGrantsForm.vue';
import CypressGrantsList from './components/CypressGrantsList.vue';
import { fetchCustomers, fetchGrants } from './utils';

export default {
  data() {
    return {
      customers: [],
      grants: [],
      applicantInfo: { projectBeneficiaries: [], projectTypes: [] },
    }
  },

  methods: {
  },

  computed: {
    beneficiaries() {
      return [
        ...new Set(this.grants.flatMap(grant => grant.eligibleProjectBeneficiaries)),
      ];
    },

    projectTypes() {
      return [
        ...new Set(this.grants.flatMap(grant => grant.eligibleProjectTypes.map(t => t.type))),
      ];
    },
  },

  components: {
    'cypress-grants-form': CypressGrantsForm,
    'cypress-grants-list': CypressGrantsList,
  },

  created() {
    fetchCustomers().then(customers => this.customers = customers);
    fetchGrants().then(grants => this.grants = grants);
  },
}
</script>

<style scoped>
header {
  line-height: 1.5;
}

main {
  display: flex;
  flex-direction: row;
  gap: 1rem;
}
</style>

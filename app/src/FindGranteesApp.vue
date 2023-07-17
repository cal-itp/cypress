<template>
  <header>
    <h1>Cypress - Find Grantees</h1>
  </header>

  <main>
    <cypress-grantees-form :grants="grants" :criteria="criteria" v-model="selectedGrant"></cypress-grantees-form>
    <cypress-grantees-list :customers="customers" :grant="selectedGrant"></cypress-grantees-list>
  </main>
</template>

<script>
import CypressGranteesForm from './components/CypressGranteesForm.vue';
import CypressGranteesList from './components/CypressGranteesList.vue';
import { fetchCustomers, fetchGrants, fetchCritieria } from './utils';

export default {
  data() {
    return {
      customers: [],
      grants: [],
      criteria: [],
      selectedGrant: null,
    }
  },

  methods: {
  },

  computed: {
  },

  components: {
    'cypress-grantees-form': CypressGranteesForm,
    'cypress-grantees-list': CypressGranteesList,
  },

  created() {
    fetchCustomers().then(customers => this.customers = customers);
    fetchGrants().then(grants => this.grants = grants);
    fetchCritieria().then(criteria => this.criteria = criteria);
  },
}
</script>

<style scoped>
header {
  line-height: 1.5;
}

main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>

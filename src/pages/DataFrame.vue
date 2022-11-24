<script>
const $gettext = s => s

export default {
  name: 'DataFrame',
  data () {
    return {
      data: [],
      headers: [],
      showDialog: false,
      input: '',
      divHeight: 0,
      errorMessage: null,
      tableChoices: [
        { val: 'links', text: $gettext('Links Table') },
        { val: 'nodes', text: $gettext('Nodes Table') },
      ],
      selectedTable: 'links',
    }
  },

  watch: {
    selectedTable () { this.fetchData() },
  },

  mounted () {
    this.$store.commit('changeNotification', '')
    this.fetchData()
    this.onResize()
  },
  methods: {
    fetchData () {
      this.data = []
      this.headers = []
      let header = new Set([])
      const features = this.selectedTable === 'links'
        ? this.$store.getters.links.features
        : this.$store.getters.nodes.features
      features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
        this.data.push(element.properties)
      })
      header = Array.from(header)
      header.forEach(element => {
        this.headers.push({ text: element, value: element })
      })
    },
    onResize () {
      this.divHeight = this.$refs.cardBox.clientHeight
    },
    addField () {
      const propsList = []
      Object.keys(this.headers).forEach(key => propsList.push(this.headers[key].value))
      if (propsList.includes(this.input)) {
        this.errorMessage = 'already exist'
      } else {
        this.$store.commit('addPropertie', { name: this.input, table: this.selectedTable })
        this.fetchData()
        this.input = ''
        this.errorMessage = ''
        this.showDialog = false
      }
    },
    cancel () {
      this.input = ''
      this.errorMessage = ''
      this.showDialog = false
    },
  },
}
</script>
<template>
  <section>
    <div
      id="card-box"
      ref="cardBox"
      class="layout"
    >
      <v-card
        class="card"
      >
        <div>
          <v-data-table
            :headers="headers"
            :height="divHeight-240"
            fixed-header
            fixed-footer
            :items="data"
            :items-per-page="100"
            :footer-props="{
              'items-per-page-options': [10, 20,100,200,-1]
            }"
            class="elevation-3"
            show-group-by
          >
            <template v-slot:top>
              <v-toolbar
                flat
              >
                <v-toolbar-title class="languages-container">
                  <div
                    v-for="(item, key) in tableChoices"
                    :key="key"
                    class="language"
                    :class="[item.val === selectedTable ? 'active' : '']"
                    :title="item.val"
                    @click="()=> selectedTable=item.val"
                  >
                    {{ $gettext(item.text) }}
                  </div>
                </v-toolbar-title>
                <v-divider
                  class="mx-4"
                  vertical
                  inset
                />
                <v-spacer />
                <v-card-actions>
                  <!--
                  <v-btn
                    class=" btn-links"
                    href="settings"
                    target="_blank"
                    @click.prevent=""
                  >
                    <v-icon
                      small
                      left
                    >
                      fas fa-cog
                    </v-icon>
                    {{ $gettext('Settings') }}
                  </v-btn>
                  -->
                  <v-btn
                    class=" btn-links"
                    href="newField"
                    target="_blank"
                    @click.prevent="showDialog=true"
                  >
                    <v-icon
                      small
                      left
                    >
                      fas fa-plus
                    </v-icon>
                    {{ $gettext('add field') }}
                  </v-btn>
                </v-card-actions>
              </v-toolbar>
            </template>
          </v-data-table>
        </div>
      </v-card>
    </div>
    <v-row
      v-resize="onResize"
    />

    <v-dialog
      v-model="showDialog"
      persistent
      max-width="290"
      @keydown.enter="addField"
      @keydown.esc="cancel"
    >
      <v-card>
        <v-card-title class="text-h5">
          {{ $gettext("New Field") }}
        </v-card-title>

        <v-card-text>
          <v-container>
            <v-col cols="12">
              <v-text-field
                v-model="input"
                :label="$gettext('name')"
              />
            </v-col>
          </v-container>
        </v-card-text>
        <v-card-text :style="{textAlign: 'center',color:'red'}">
          {{ errorMessage }}
        </v-card-text>

        <v-card-actions>
          <v-spacer />

          <v-btn
            color="grey"
            text
            @click="cancel"
          >
            {{ $gettext("Cancel") }}
          </v-btn>

          <v-btn
            color="green darken-1"
            text
            @click="addField"
          >
            {{ $gettext("Add") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>
<style lang="scss" scoped>
.layout {
  position: absolute;
  width: calc(100%);
  height: calc(100% - 50px);
  display: flex;
  justify-content: center;
  align-items: center;
}
.layout-overlay {
  height: 100%;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  position: absolute;
}
.card {
  width:  calc(100% - 10em);
  height: calc(100% - 2em);
  overflow-y: auto;
  padding: 40px;
}
.title {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 3.5em;
  color: $primary !important;
  font-weight: bold;
}
.subtitle {
  font-size: 2em;
  color: $secondary !important;
  font-weight: bold;
  margin: 40px;
}
.card button {
  margin-top: 40px;
}
.animate-login {
  transform: translateY(-185%);
  transition: 1s;
}
.animate-layer {
  opacity: 0;
  transition: 1s;
}
.languages-container {
  display: flex;
}
.language {
  border-right: 1px solid $grey-light;
  padding-right:10px;
  padding-left:10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $grey-light;
  cursor: pointer;
  transition: 0.3s;
}
.language.active, .language:hover {
  color: $secondary;
}
.language:last-child {
  border-right: 0;
}
</style>

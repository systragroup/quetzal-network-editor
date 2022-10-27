<script>

export default {
  name: 'DataFrame',
  data () {
    return {
      data: [],
      headers: [],
      showDialog: false,
      input: '',
      divHeight: 0,
    }
  },

  computed: {

  },

  mounted () {
    this.$store.commit('changeNotification', '')

    let header = new Set([])
    this.$store.getters.links.features.forEach(element => {
      Object.keys(element.properties).forEach(key => header.add(key))
      this.data.push(element.properties)
    })
    header = Array.from(header)
    header.forEach(element => {
      this.headers.push({ text: element, value: element })
    })
    this.onResize()
  },
  methods: {
    onResize () {
      this.divHeight = this.$refs.cardBox.clientHeight
    },
    addField (name) {
      console.log(this.headers)
      this.$store.commit('addPropertie', { name: this.input })
      this.input = ''
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
            class="elevation-1"
            show-group-by
          >
            <template v-slot:top>
              <v-toolbar
                flat
              >
                <v-toolbar-title>{{ $gettext('Links Table') }}</v-toolbar-title>
                <v-divider
                  class="mx-4"
                  vertical
                  inset
                />
                <v-spacer />
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
      @keydown.esc="showDialog=false"
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

        <v-card-actions>
          <v-spacer />

          <v-btn
            color="grey"
            text
            @click="showDialog=false"
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
</style>

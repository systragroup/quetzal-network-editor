import { quetzalClient } from '@src/axiosClient.js'
import s3 from '@src/AWSClient'
import { v4 as uuid } from 'uuid'
import router from '../../router'

const $gettext = s => s

export default {
  namespaced: true,
  state: {
    stateMachineArn: 'arn:aws:states:ca-central-1:142023388927:stateMachine:osm-api',
    bucket: 'quenedi-osm',
    callID: '',
    status: '',
    timer: 0,
    running: false,
    executionArn: '',
    error: false,
    tags: ['highway', 'maxspeed', 'lanes', 'name', 'oneway', 'surface'],
    highway: [
      'motorway',
      'motorway_link',
      'trunk',
      'trunk_link',
      'primary',
      'primary_link',
    ],
    colorDict: {
      motorway: 'E892A2',
      motorway_link: 'E892A2',
      trunk: 'E892A2',
      trunk_link: 'E892A2',
      primary: 'FCD6A4',
      primary_link: 'FCD6A4',
      secondary: 'F7F9BE',
      secondary_link: 'F7F9BE',
      tertiary: '808080',
      tertiary_link: '808080',
      residential: '808080',
      service: '808080',
      unclassified: '808080',
      cycleway: '1D8621',
    },
    widthDict: {
      motorway: 4,
      motorway_link: 4,
      trunk: 4,
      trunk_link: 4,
      primary: 4,
      primary_link: 4,
      secondary: 3,
      secondary_link: 3,
      tertiary: 2,
      tertiary_link: 2,
      residential: 2,
      service: 2,
      unclassified: 2,
      cycleway: 2,
    },
  },
  mutations: {
    cleanRun (state) {
      state.running = false
      state.executionArn = ''
      state.error = false
    },
    setCallID (state) { state.callID = uuid() },

    terminateExecution (state) {
      state.running = false
      state.error = true
      state.executionArn = ''
    },
    changeRunning (state, payload) {
      state.running = payload
    },
    changeHighway (state, payload) {
      state.highway = payload
    },
    succeedExecution (state) {
      state.running = false
      state.executionArn = ''
      this.commit('changeNotification',
        { text: $gettext('OSM network imported successfully!'), autoClose: false, color: 'success' })
    },

  },
  actions: {
    startExecution ({ state, commit, dispatch }, payload) {
      // commit('setParameters', payload.parameters)
      state.running = true
      state.error = false
      let overpassQuery = `[out:json][timeout:180];
      (
      `
      overpassQuery += state.highway.map(highway => `way["highway"="${highway}"](${payload.bbox});\n`).join('')
      overpassQuery += `);
      out body;
      >;
      out skel qt;
      `
      let data = {
        input: JSON.stringify({
          overpassQuery: overpassQuery,
          tags: state.tags,
          callID: state.callID,
        }),
        name: state.callID,
        stateMachineArn: state.stateMachineArn,
      }
      quetzalClient.client.post('',
        data = JSON.stringify(data),
      ).then(
        response => {
          state.executionArn = response.data.executionArn
          dispatch('pollExecution')
        }).catch(err => {
        commit('changeAlert', err, { root: true })
        state.running = false
        state.status = 'FAILED'
      })
    },
    async pollExecution ({ commit, state, dispatch }) {
      const intervalId = setInterval(() => {
        let data = { executionArn: state.executionArn }
        state.timer = state.timer - 2
        quetzalClient.client.post('/describe',
          data = JSON.stringify(data),
        ).then(
          async response => {
            state.status = response.data.status
            console.log(state.status)
            if (state.status === 'SUCCEEDED') {
              await dispatch('downloadOSMFromS3')
              commit('succeedExecution')
              clearInterval(intervalId)
            } else if (['FAILED', 'TIMED_OUT', 'ABORTED'].includes(state.status)) {
              commit('terminateExecution')
              clearInterval(intervalId)
            }
          }).catch(err => { commit('changeAlert', err, { root: true }) })
      }, 2000)
    },
    stopExecution ({ state, commit }) {
      let data = { executionArn: state.executionArn }
      quetzalClient.client.post('/abort',
        data = JSON.stringify(data),
      ).then(
        response => {
          commit('terminateExecution', response.data)
          // Maybe we sould wait for back to say that execution is terminated (but the wait is awkward)
        }).catch(
        err => {
          commit('changeAlert', err, { root: true })
        })
    },
    async downloadOSMFromS3 ({ state, commit }) {
      function applyDict (links) {
        // 00BCD4
        Object.keys(state.colorDict).forEach(highway => {
          links.features.filter(link => link.properties.highway === highway).forEach(
            link => {
              link.properties.route_width = state.widthDict[highway]
              link.properties.route_color = state.colorDict[highway]
            })
        })
        return links
      }

      let rlinks = await s3.readJson(state.bucket, state.callID.concat('/links.geojson'))
      rlinks = applyDict(rlinks)
      commit('loadrLinks', rlinks, { root: true })
      const rnodes = await s3.readJson(state.bucket, state.callID.concat('/nodes.geojson'))
      commit('loadrNodes', rnodes, { root: true })
      await s3.deleteFolder(state.bucket, state.callID)
      console.log('downloaded')
      router.push('/Home').catch(() => {})
    },
  },
  getters: {
    running: (state) => state.running,
    status: (state) => state.status,
    executionArn: (state) => state.executionArn,
    error: (state) => state.error,
    callID: (state) => state.callID,
    bucket: (state) => state.bucket,
    timer: (state) => state.timer,
    highway: (state) => state.highway,
    tags: (state) => state.tags,
  },
}

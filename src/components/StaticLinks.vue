<script>
import { MglGeojsonLayer, MglPopup} from 'vue-mapbox'
	
export default {
	name: 'StaticLinks',
	components: {
	MglGeojsonLayer,
	MglPopup
},
props:["map","showedTrips","isEditorMode"],

	data () {
	return {

		popup: {
        coordinates: [0, 0],
        showed: false,
        content: null
      },
		
	}
},
created() {
},
	watch: {
		showedTrips(newList, oldList) {
      if (this.map !== null) {
        // Set all nodes to hidden
        this.nodes.features.forEach(feature => {
          this.map.setFeatureState({ source: 'nodes', id: feature.properties.index }, 
                                   { hidden: true })
        })
        // Set all links to hidden
        this.links.features.forEach(feature => {
          this.map.setFeatureState({ source: 'links', id: feature.properties.index }, 
                                   { hidden: true })
        }) 
        // Set visible links
        const visibleLinks = new Set();
        newList.forEach(line => {
          this.linksPerLine[line].forEach(link => visibleLinks.add(link))
        })
        visibleLinks.forEach(link => {
          this.map.setFeatureState({ source: 'links', id: link.properties.index }, 
                                   { hidden: false })
        })
        // Set visible nodes
        const a = [...visibleLinks].map(item => item.properties.a);
        const b = [...visibleLinks].map(item => item.properties.b);
        const ab = new Set([...a, ...b]);
        [...ab].forEach(id => {
          this.map.setFeatureState({ source: 'nodes', id: id }, 
                                   { hidden: false })
        })                  
      }
    },
		
	},
	computed:{
		links() {return this.$store.getters.links},
  	nodes() {return this.$store.getters.nodes},
		linksPerLine() {
      const groupBy = function(xs) {
        return xs.reduce(function(rv, x) {
          (rv[x.properties.trip_id] = rv[x.properties.trip_id] || []).push(x);
          return rv;
        }, {});
      };
      return groupBy(this.links.features)
    },
	},

	methods: {
		enterLink(event) {
			
      event.map.getCanvas().style.cursor = 'pointer';
      this.popup.coordinates = [event.mapboxEvent.lngLat.lng,
                                event.mapboxEvent.lngLat.lat
      ]
      this.popup.content = event.mapboxEvent.features[0].properties.trip_id
      this.popup.showed = true
    },
    leaveLink(event) {
      event.map.getCanvas().style.cursor = '';
      this.popup.showed = false
    },

	},
}
</script>
<template>
	<section>
		<MglGeojsonLayer
        source-id="links"
        :source="{
          type: 'geojson',
          data: this.links,
          buffer: 0,
          promoteId: 'index',
        }"
        layer-id="links"
        :layer="{
          interactive: true,
          type: 'line',
          minzoom: 9,
          maxzoom: 18,
          paint: {
            'line-color': ['case', ['has', 'route_color'], ['concat', '#', ['get', 'route_color']], '#B5E0D6'],
            'line-opacity': ['case', ['boolean', ['feature-state', 'hidden'], false], 0.1, 1],
            'line-width': 3
          }
        }"
        v-on="isEditorMode ? { } : { mouseenter: enterLink, mouseleave: leaveLink }"
        >  
      </MglGeojsonLayer>

      <MglGeojsonLayer
        source-id="nodes"
        :source="{
          type: 'geojson',
          data: this.nodes,
          buffer: 0,
          promoteId: 'index',
        }"
        layer-id="nodes"
        :layer="{
          interactive: true,
          type: 'circle',
          minzoom: 12,
          maxzoom: 18,
          paint: {
            'circle-color': ['case', ['boolean', ['feature-state', 'hidden'], false],'#9E9E9E', '#2C3E4E'],
            'circle-radius': 3,
          }
        }"
        >   
      </MglGeojsonLayer>

      <MglPopup :closeButton="false"
                :showed="popup.showed"
                :coordinates="popup.coordinates">
        {{this.popup.content}}
      </MglPopup>

	</section>
</template>
<style lang="scss" scoped>

</style>

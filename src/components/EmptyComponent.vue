<script>
import { MglPopup} from 'vue-mapbox'
	
export default {
	name: 'EmptyComponent',
	components: {
	MglPopup
},
props:{
	value: {
      type: Array,
      default: []	
		},
},
	data () {
	return {
		
	}
},
	watch: {


	},

	methods: {

	},
}
</script>
<template>
	<section>


	</section>
</template>
<style lang="scss" scoped>

</style>

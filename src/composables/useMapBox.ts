/* eslint-disable @typescript-eslint/naming-convention */
import { isDefined } from '@src/utils/utils'
import { Map, MapMouseEvent } from 'mapbox-gl'
import { ref, watch, ShallowRef } from 'vue'

interface SelectedFeature {
  sourceId: string
  featureId: string
}

export function useHover(map: ShallowRef<Map>) {
  function onHover(event: MapMouseEvent) {
    if (event.features) {
      const feature = event.features[0]
      const sourceId = feature.source
      const featureId = feature.id as string
      if (sourceId && isDefined(featureId)) {
        hoveringFeature.value = { sourceId, featureId }
        map.value.getCanvas().style.cursor = 'pointer'
      }
    }
  }
  function offHover() {
    if (hoveringFeature.value) {
      map.value.getCanvas().style.cursor = ''
      hoveringFeature.value = null
    }
  }
  const hoveringFeature = ref<SelectedFeature | null>(null)
  watch(hoveringFeature, (newVal, oldVal) => {
    if (oldVal) {
      map.value.setFeatureState({ source: oldVal.sourceId, id: oldVal.featureId }, { hover: false })
    } if (newVal) {
      map.value.setFeatureState({ source: newVal.sourceId, id: newVal.featureId }, { hover: true })
    }
  })

  return {
    hoveringFeature,
    onHover,
    offHover,
  }
}

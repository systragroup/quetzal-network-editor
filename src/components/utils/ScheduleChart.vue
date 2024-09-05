<script setup>
import { ref, toRefs, watch } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import {
  Line as LineChart,
  getDatasetAtEvent,
} from 'vue-chartjs'
import zoomPlugin from 'chartjs-plugin-zoom'
import 'chartjs-adapter-luxon'

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin,
)

const xScaleOptions = { type: 'time',
  time: {
    parser: 'HH:mm:ss',
    tooltipFormat: 'HH:mm:ss',
  },
  min: '00:00:00',
  max: '23:00:00',
}

const scales = {
  x: { ...xScaleOptions,
    position: 'top',
  },
  x1: { ...xScaleOptions,
    position: 'bottom',
  },
  y: {
    autoSkip: false,
    ticks: {
      padding: 5, // Adjust the padding value as needed
      callback: function(value) {
        var label = this.getLabelForValue(value)
        return label.length > 15 ? [label.slice(0, 15), label.slice(15)] : label
      },
    },
  },
}

const zoomOptions = {
  zoom: {
    wheel: {
      enabled: true,
    },
    mode: 'x',
  },
  pan: {
    enabled: true,
    mode: 'x',
  },
}

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
})

const options = ref({
  responsive: true,
  maintainAspectRatio: false,
  scales: scales,
  indexAxis: 'y',
  plugins: {
    zoom: zoomOptions,
    legend: {
      display: false,
    },
  },
  animation: {
    duration: 0,
  },
})

const { data } = toRefs(props)
watch(data, (val) => {
  if (chartRef.value.chart) {
    chartRef.value.chart.data.datasets = val.datasets
    chartRef.value.chart.update()
  }
}
, { deep: true })

function datasetAtEvent(dataset) {
  if (dataset.length > 0) {
    const datasetIndex = dataset[0].datasetIndex
    console.log(data.value.datasets[datasetIndex].id)
  }
}

const chartRef = ref()

function onClick(event) {
  datasetAtEvent(getDatasetAtEvent(chartRef.value.chart, event))
}

</script>
<template>
  <LineChart
    ref="chartRef"
    :data="data"
    :options="options"
    @click="onClick"
  />
</template>

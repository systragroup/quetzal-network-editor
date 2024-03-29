<script>
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
import { Line as LineChart } from 'vue-chartjs'
import 'chartjs-adapter-moment'

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
)

const scales = {
  x: {
    type: 'time',
    min: '2021-11-06T23:39:30',
  },
}

const data = {
  datasets: [{
    data: [{
      x: '2021-11-06T23:39:30',
      y: 'Montréal',
    }, {
      x: '2021-11-06T23:42:30',
      y: 'Montréal',
    }, {
      x: '2021-11-07T00:10:28',
      y: 'Ottawa',
    }, {
      x: '2021-11-07T00:15:28',
      y: 'Ottawa',
    }, {
      x: '2021-11-07T00:59:28',
      y: 'Peterborough',
    }, {
      x: '2021-11-07T01:04:28',
      y: 'Peterborough',
    }, {
      x: '2021-11-07T01:33:28',
      y: 'Toronto',
    }, {
      x: '2021-11-07T01:39:28',
      y: 'Toronto',
    },
    ],
  }],
}

const options = {
  responsive: true,
  maintainAspectRatio: false,
  scales: scales,
  indexAxis: 'y',
  plugins: {
    legend: {
      display: false,
    },
  },
}
export default {
  name: 'ScheduleChart',
  components: { LineChart },
  data() {
    return {
      chartData: data,
      chartOptions: options,
    }
  },
}
</script>
<template>
  <LineChart
    :data="chartData"
    :options="chartOptions"
  />
</template>

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: "#a5f3fc", // cyan-200
        font: {
          size: 12,
        },
      },
    },
    tooltip: {
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      titleColor: "#ffffff",
      bodyColor: "#a5f3fc",
      borderColor: "#06b6d4",
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: {
        color: "#a5f3fc",
        font: {
          size: 11,
        },
      },
      grid: {
        color: "rgba(6, 182, 212, 0.1)",
      },
    },
    y: {
      ticks: {
        color: "#a5f3fc",
        font: {
          size: 11,
        },
      },
      grid: {
        color: "rgba(6, 182, 212, 0.1)",
      },
    },
  },
};

export function RealTimeLineChart({ data, title, height = 200 }) {
  const chartData = {
    labels: data.labels || [],
    datasets: [
      {
        label: data.label || "Data",
        data: data.values || [],
        borderColor: "#06b6d4",
        backgroundColor: "rgba(6, 182, 212, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "#06b6d4",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  return (
    <div className="bg-white/5 border border-cyan-500/20 rounded-2xl p-4 shadow-lg shadow-cyan-500/10">
      <h3 className="text-lg font-semibold text-white/90 mb-4">{title}</h3>
      <div style={{ height }}>
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}

export function RealTimeBarChart({ data, title, height = 200 }) {
  const chartData = {
    labels: data.labels || [],
    datasets: [
      {
        label: data.label || "Data",
        data: data.values || [],
        backgroundColor: [
          "rgba(6, 182, 212, 0.8)",
          "rgba(236, 72, 153, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(239, 68, 68, 0.8)",
        ],
        borderColor: [
          "#06b6d4",
          "#ec4899",
          "#22c55e",
          "#f59e0b",
          "#ef4444",
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="bg-white/5 border border-cyan-500/20 rounded-2xl p-4 shadow-lg shadow-cyan-500/10">
      <h3 className="text-lg font-semibold text-white/90 mb-4">{title}</h3>
      <div style={{ height }}>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}

export function RealTimeDoughnutChart({ data, title, height = 200 }) {
  const chartData = {
    labels: data.labels || [],
    datasets: [
      {
        data: data.values || [],
        backgroundColor: [
          "rgba(6, 182, 212, 0.8)",
          "rgba(236, 72, 153, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(239, 68, 68, 0.8)",
        ],
        borderColor: [
          "#06b6d4",
          "#ec4899",
          "#22c55e",
          "#f59e0b",
          "#ef4444",
        ],
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="bg-white/5 border border-cyan-500/20 rounded-2xl p-4 shadow-lg shadow-cyan-500/10">
      <h3 className="text-lg font-semibold text-white/90 mb-4">{title}</h3>
      <div style={{ height }}>
        <Doughnut data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}

// Hook để tạo dữ liệu real-time
export function useRealTimeData(initialData = { labels: [], values: [] }, maxPoints = 20) {
  const [data, setData] = React.useState(initialData);

  const addDataPoint = React.useCallback((value, label = null) => {
    setData(prev => {
      const newLabels = [...prev.labels, label || new Date().toLocaleTimeString()];
      const newValues = [...prev.values, value];
      
      // Giữ tối đa maxPoints điểm
      if (newLabels.length > maxPoints) {
        return {
          labels: newLabels.slice(-maxPoints),
          values: newValues.slice(-maxPoints),
        };
      }
      
      return {
        labels: newLabels,
        values: newValues,
      };
    });
  }, [maxPoints]);

  const resetData = React.useCallback(() => {
    setData(initialData);
  }, [initialData]);

  return { data, addDataPoint, resetData };
}

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const ProgressChart = ({ percentage }) => {
  const svgRef = useRef();

  useEffect(() => {
    // Configuraciones básicas del gráfico
    const width = 150;
    const height = 150;
    const margin = 10;
    const radius = Math.min(width, height) / 2 - margin;

    // Seleccionamos el SVG y lo limpiamos por si se re-renderiza
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .html(""); 

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Escala de color dinámica: Verde (>60), Naranja (>30), Rojo (<30)
    // Esto es clave para la accesibilidad y el alto contraste visual
    const color = percentage >= 60 ? "#10b981" : percentage >= 30 ? "#f59e0b" : "#dc2626";

    // Generador de arcos
    const arc = d3.arc()
      .innerRadius(radius - 15)
      .outerRadius(radius)
      .startAngle(0);

    // Dibujamos el fondo gris del círculo
    g.append("path")
      .datum({ endAngle: 2 * Math.PI })
      .style("fill", "#e5e7eb")
      .attr("d", arc);

    // Dibujamos el progreso real animado
    g.append("path")
      .datum({ endAngle: 0 }) // Empezamos en 0 para la animación
      .style("fill", color)
      .attr("d", arc)
      .transition()
      .duration(1000) // Animación de 1 segundo
      .attrTween("d", function(d) {
        const interpolate = d3.interpolate(0, (percentage / 100) * 2 * Math.PI);
        return function(t) {
          d.endAngle = interpolate(t);
          return arc(d);
        };
      });

    // Agregamos el texto con el porcentaje en el centro
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .style("font-size", "24px")
      .style("font-weight", "bold")
      .style("fill", color)
      .text(`${percentage}%`);

  }, [percentage]);

  return <svg ref={svgRef}></svg>;
};

export default ProgressChart;
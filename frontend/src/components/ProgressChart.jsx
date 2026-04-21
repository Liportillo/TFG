import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const ProgressChart = ({ percentage, isAltoContraste }) => {
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

    // Escala de color dinámica adaptada a Alto Contraste
    const color = percentage >= 60 ? (isAltoContraste ? "#00ff00" : "#10b981") : percentage >= 30 ? "#f59e0b" : "#dc2626";
    
    // Color de fondo del anillo
    const bgColor = isAltoContraste ? "#333333" : "#e5e7eb";

    // Generador de arcos
    const arc = d3.arc()
      .innerRadius(radius - 15)
      .outerRadius(radius)
      .startAngle(0);

    // Dibujamos el fondo del círculo
    g.append("path")
      .datum({ endAngle: 2 * Math.PI })
      .style("fill", bgColor)
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

    // Añadimos el texto central
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", "24px")
      .attr("font-weight", "bold")
      .attr("fill", isAltoContraste ? "#ffffff" : "#10b981")
      .text(`${percentage}%`);

  }, [percentage, isAltoContraste]); // Se vuelve a renderizar si cambia el modo visual

  return <svg ref={svgRef}></svg>;
};

export default ProgressChart;
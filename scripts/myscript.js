const margin = {top: 50, right: 50, bottom: 100, left: 50};
const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const teamNames = {
  "71": "Aston Villa",
  "72": "Everton",
  "73": "Bournemouth",
  "74": "Southampton",
  "75": "Leicester City",
  "76": "West Bromwich Albion",
  "77": "Sunderland",
  "78": "Crytsal Palace",
  "79": "Norwich City",
  "80": "Chelsea",
  "81": "West Ham",
  "82": "Tottenham Hotspur",
  "83": "Arsenal",
  "84": "Swansea City",
  "85": "Stoke City",
  "86": "Newcastle United",
  "87": "Liverpool",
  "88": "Manchester City",
  "89": "Manchester United",
  "90": "Watford",
  "91": "Hull City",
  "92": "Burnley",
  "93": "Middlesbrough"
};

const svg = d3.select("#plot")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom);

const chartGroup = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);
  
chartGroup.append("text")
  .attr("class", "x-axis-label")
  .attr("text-anchor", "middle")
  .attr("x", width / 2)
  .attr("y", height + margin.bottom - 10)
  .text("Teams");

chartGroup.append("text")
  .attr("class", "y-axis-label")
  .attr("text-anchor", "middle")
  .attr("transform", `rotate(-90)`)
  .attr("x", -height / 2)
  .attr("y", -margin.left + 15)
  .text("Goals and xG");

const tooltip = d3.select("#plot")
  .append("div")
  .attr("class", "tooltip");

let originalData; 

d3.csv("https://raw.githubusercontent.com/annette-antony/sportsperformance/refs/heads/main/scripts/data.csv").then(data => {

  data.forEach(d => {
    d.goals = +d.goals;
    d.xG = +d.xG;
    d.xG = Math.round(d.xG * 100) / 100;
  });
  
  data = data.filter(d => !isNaN(d.goals) && !isNaN(d.xG) && !isNaN(d.team_id));

  originalData = data;

  const aggregated = reAggregate(data);

  const x = d3.scaleBand().range([0, width]).padding(0.2);
  const y = d3.scaleLinear().range([height, 0]);

  updateChart(aggregated);

  d3.select("#filter-home").on("click", () => {
    const filtered = data.filter(d => d.home_away === "h");
    updateChart(reAggregate(filtered));
  });

  d3.select("#filter-away").on("click", () => {
    const filtered = data.filter(d => d.home_away === "a");
    updateChart(reAggregate(filtered));
  });

  d3.select("#filter-all").on("click", () => {
    updateChart(reAggregate(originalData));
  });

  function reAggregate(rawData) {
    const rolled = d3.rollups(rawData, v => {
      return {
        goals: d3.sum(v, d => d.goals),
        xG: d3.sum(v, d => d.xG),
        matches: v.map(d => d.match_id)
      };
    }, d => d.team_id).map(([team_id, values]) => {
      return {
        team_id: team_id,
        goals: values.goals,
        xG: Math.round(values.xG * 100) / 100,
        matches: values.matches
      };
    });

    return rolled;
  }

  function updateChart(data) {
  const sortedTeamIds = data
    .map(d => d.team_id)        
    .map(String)               
    .sort((a, b) => +a - +b);    

  const x = d3.scaleBand().range([0, width]).padding(0.2)
    .domain(sortedTeamIds);

  const maxVal = d3.max(data, d => Math.max(d.goals, d.xG)) || 1;
  const y = d3.scaleLinear().range([height, 0]).domain([0, maxVal]);

  const xAxis = d3.axisBottom(x).tickFormat(d => teamNames[d]);
  const yAxis = d3.axisLeft(y);

  let xAxisG = chartGroup.selectAll(".x-axis").data([null]);
  xAxisG = xAxisG.enter().append("g").attr("class", "x-axis").merge(xAxisG);
  xAxisG
    .attr("transform", `translate(0,${height})`)
    .transition().duration(750)
    .call(xAxis);

  let yAxisG = chartGroup.selectAll(".y-axis").data([null]);
  yAxisG = yAxisG.enter().append("g").attr("class", "y-axis").merge(yAxisG);
  yAxisG
    .transition().duration(750)
    .call(yAxis);

  xAxisG.selectAll("text")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-45)")
    .attr("dx", "-0.5em")
    .attr("dy", "0.5em");

  const barGroups = chartGroup.selectAll(".bar-group")
    .data(data, d => d.team_id);

  barGroups.exit().remove();

  const barGroupsEnter = barGroups.enter()
    .append("g")
    .attr("class", "bar-group");

  const barGroupMerged = barGroupsEnter.merge(barGroups)
    .attr("transform", d => `translate(${x(d.team_id)},0)`);

  const barWidth = x.bandwidth() / 2;
  
  let goalsBar = barGroupMerged.selectAll(".goals-bar").data(d => [d]);
  goalsBar.exit().remove();
  goalsBar = goalsBar.enter()
    .append("rect")
    .attr("class", "bar goals-bar")
    .merge(goalsBar)
    .attr("x", 0)
    .attr("width", barWidth)
    .on("mouseover", (event, d) => showTooltip(event, `Team: ${teamNames[d.team_id]}<br>Goals: ${d.goals}`))
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip)
    .on("click", (event, d) => highlightTeamMatches(d));

  goalsBar.transition().duration(2000)
    .attr("y", d => y(d.goals))
    .attr("height", d => height - y(d.goals))
    .attr("fill", "steelblue");

  let xgBar = barGroupMerged.selectAll(".xg-bar").data(d => [d]);
  xgBar.exit().remove();
  xgBar = xgBar.enter()
    .append("rect")
    .attr("class", "bar xg-bar")
    .merge(xgBar)
    .attr("x", barWidth)
    .attr("width", barWidth)
    .on("mouseover", (event, d) => showTooltip(event, `Team: ${teamNames[d.team_id]}<br>xG: ${d.xG.toFixed(2)}`))
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip)
    .on("click", (event, d) => highlightTeamMatches(d));

  xgBar.transition().duration(2000)
    .attr("y", d => y(d.xG))
    .attr("height", d => height - y(d.xG))
    .attr("fill", "orange");
}


  function showTooltip(event, htmlContent) {
    tooltip.style("opacity", 1)
      .html(htmlContent)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 20) + "px");
  }

  function moveTooltip(event) {
    tooltip.style("left", (event.pageX + 10) + "px")
           .style("top", (event.pageY - 20) + "px");
  }

  function hideTooltip() {
    tooltip.style("opacity", 0);
  }

  function highlightTeamMatches(d) {
    // Implement highlighting logic here.
    console.log("Team clicked:", d.team_id, "Matches:", d.matches);
  }

});

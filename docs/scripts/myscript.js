const margin = {top: 50, right: 50, bottom: 100, left: 50};
const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("#plot")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom);

const chartGroup = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("#plot")
  .append("div")
  .attr("class", "tooltip");

let originalData; // Will hold the original CSV data to filter later

// Load CSV data
d3.csv("https://raw.githubusercontent.com/annette-antony/sportsperformance/refs/heads/main/scripts/data.csv").then(data => {

  // Convert numeric fields to numbers and round xG to two decimals
  data.forEach(d => {
    d.goals = +d.goals;
    d.xG = +d.xG;
    // Round xG to 2 decimals
    d.xG = Math.round(d.xG * 100) / 100;
  });

  // Remove rows with NaN values in goals or xG
  data = data.filter(d => !isNaN(d.goals) && !isNaN(d.xG));

  originalData = data;

  // Initial aggregation with all data
  const aggregated = reAggregate(data);

  // Set up scales (will be updated in updateChart)
  const x = d3.scaleBand().range([0, width]).padding(0.2);
  const y = d3.scaleLinear().range([height, 0]);

  updateChart(aggregated);

  // Filter buttons
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
    // Aggregate data by team_id
    // Summing goals and xG across all matches in rawData
    const rolled = d3.rollups(rawData, v => {
      return {
        goals: d3.sum(v, d => d.goals),
        xG: d3.sum(v, d => d.xG),
        matches: v.map(d => d.match_id) // store matches if needed
      };
    }, d => d.team_id).map(([team_id, values]) => {
      return {
        team_id: team_id,
        goals: values.goals,
        xG: Math.round(values.xG * 100) / 100, // ensure rounding even after aggregation
        matches: values.matches
      };
    });

    return rolled;
  }

  function updateChart(data) {
    // Update domains
    const x = d3.scaleBand().range([0, width]).padding(0.2)
      .domain(data.map(d => d.team_id));
    const maxVal = d3.max(data, d => Math.max(d.goals, d.xG)) || 1;
    const y = d3.scaleLinear().range([height, 0]).domain([0, maxVal]);

    // Axes
    const xAxis = d3.axisBottom(x).tickFormat(d => d);
    const yAxis = d3.axisLeft(y);

    // Create/update axis groups
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

    // Bar group (for grouped bars: goals and xG)
    const barGroups = chartGroup.selectAll(".bar-group")
      .data(data, d => d.team_id);

    barGroups.exit().remove();

    const barGroupsEnter = barGroups.enter()
      .append("g")
      .attr("class", "bar-group");
      
    const barGroupMerged = barGroupsEnter.merge(barGroups)
      .attr("transform", d => `translate(${x(d.team_id)},0)`);

    // Width for each bar in the group
    const barWidth = x.bandwidth() / 2;

    // Goals bars
    let goalsBar = barGroupMerged.selectAll(".goals-bar").data(d => [d]);
    goalsBar.exit().remove();
    goalsBar = goalsBar.enter()
      .append("rect")
      .attr("class", "bar goals-bar")
      .merge(goalsBar)
      .attr("x", 0)
      .attr("width", barWidth)
      .on("mouseover", (event, d) => showTooltip(event, `Team: ${d.team_id}<br>Goals: ${d.goals}`))
      .on("mousemove", moveTooltip)
      .on("mouseout", hideTooltip)
      .on("click", (event, d) => highlightTeamMatches(d));

    goalsBar.transition().duration(2000)
      .attr("y", d => y(d.goals))
      .attr("height", d => height - y(d.goals))
      .attr("fill", "steelblue");

    // xG bars
    let xgBar = barGroupMerged.selectAll(".xg-bar").data(d => [d]);
    xgBar.exit().remove();
    xgBar = xgBar.enter()
      .append("rect")
      .attr("class", "bar xg-bar")
      .merge(xgBar)
      .attr("x", barWidth)
      .attr("width", barWidth)
      .on("mouseover", (event, d) => showTooltip(event, `Team: ${d.team_id}<br>xG: ${d.xG.toFixed(2)}`))
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
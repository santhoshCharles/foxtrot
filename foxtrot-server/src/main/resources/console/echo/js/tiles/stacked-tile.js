/**
 * Copyright 2014 Flipkart Internet Pvt. Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function StackedTile() {
  this.object = "";
}

function getstackedChartFormValues() {
  var period = $("#stacked-time-unit").val();
  var timeframe = $("#stacked-timeframe").val();
  var groupingKey = $("#stacked-grouping-key").val();
  var stackingKey = $("#stacking-key").val();
  var uniqueKey = $("#stacked-uniquekey").val();
  if (groupingKey == "none" || stackingKey == "none") {
    return [[], false];
  }
  var groupingString = currentFieldList[parseInt(groupingKey)].field;
  var stackingString = currentFieldList[parseInt(stackingKey)].field;
  var nestingArray = [];
  nestingArray.push(groupingString);
  nestingArray.push(stackingString);
  var status = true;
  if (!$("#stacked-time-unit").valid() || !$("#stacked-timeframe").valid()) {
    status = false;
  }
  return [{
    "period": period
    , "timeframe": timeframe
    , "groupingKey": groupingString
    , "stackingKey": stackingString
    , "uniqueKey": uniqueKey
    , "nesting": nestingArray
  }, status]
}

function setStackedChartFormValues(object) {
  $("#stacked-time-unit").val(object.tileContext.period);
  $("#stacked-time-unit").selectpicker('refresh');
  $("#stacked-timeframe").val(object.tileContext.timeframe);
  $("#stacked-grouping-key").val(parseInt(currentFieldList.findIndex(x => x.field == object.tileContext.groupingKey)));
  $("#stacked-grouping-key").selectpicker('refresh');
  $("#stacking-key").val(parseInt(currentFieldList.findIndex(x => x.field == object.tileContext.stackingKey)));
  $("#stacking-key").selectpicker('refresh');
  $("#stacked-uniquekey").val(currentFieldList.findIndex(x => x.field == object.tileContext.uniqueKey));
  $("#stacked-uniquekey").selectpicker('refresh');
}

function clearstackedChartForm() {
  var parentElement = $("#" + currentChartType + "-chart-data");
  var timeUnitEl = parentElement.find("#stacked-time-unit");
  timeUnitEl.find('option:eq(0)').prop('selected', true);
  $(timeUnitEl).selectpicker('refresh');
  var timeframe = parentElement.find("#stacked-timeframe");
  timeframe.val('');
  var groupingKey = parentElement.find("#stacked-grouping-key");
  groupingKey.find('option:eq(0)').prop('selected', true);
  $(groupingKey).selectpicker('refresh');
  var stackingKey = parentElement.find("#stacking-key");
  stackingKey.find('option:eq(0)').prop('selected', true);
  $(stackingKey).selectpicker('refresh');
  var stackingBarUniqueKey = parentElement.find("#stacked-uniquekey");
  stackingBarUniqueKey.find('option:eq(0)').prop('selected', true);
  $(stackingBarUniqueKey).selectpicker('refresh');
}
StackedTile.prototype.getQuery = function (object) {
  this.object = object;
  var filters = [];
  if(globalFilters) {
    filters.push(timeValue(object.tileContext.period, object.tileContext.timeframe, getGlobalFilters()))
  } else {
    filters.push(timeValue(object.tileContext.period, object.tileContext.timeframe, getPeriodSelect(object.id)))
  }

  if(object.tileContext.filters) {
    for (var i = 0; i < object.tileContext.filters.length; i++) {
      filters.push(object.tileContext.filters[i]);
    }
  }
  var data = {
    "opcode": "group"
    , "table": object.tileContext.table
    , "filters": filters
    , "uniqueCountOn": object.tileContext.uniqueCountOn && object.tileContext.uniqueCountOn != "none" ? object.tileContext.uniqueCountOn : null
    , "nesting": object.tileContext.nesting
  }
  $.ajax({
    method: "post"
    , dataType: 'json'
    , accepts: {
      json: 'application/json'
    }
    , url: apiUrl + "/v1/analytics"
    , contentType: "application/json"
    , data: JSON.stringify(data)
    , success: $.proxy(this.getData, this)
  });
}

StackedTile.prototype.getData = function (data) {
  if (data.result == undefined || data.result.length == 0) return;
  var xAxis = [];
  var yAxis = [];
  var label = [];
  var i = 0;
  var queryResult = data.result;

  // First Get unique x-axis values and define x-axis index for them
  var xAxisTicks = [];
  var xAxisTicksMap = {};
  var index = 0;
  for (var xAxisKey in queryResult) {
    if (!queryResult.hasOwnProperty(xAxisKey)) {
      continue;
    }
    xAxisTicks.push([index, xAxisKey]);
    xAxisTicksMap[xAxisKey] = index;
    index += 1;
  }

  // Now calculate all possible y axis values
  var yAxisTicks = {};
  var yAxisSeriesMap = {};
  index = 0;
  for (xAxisKey in queryResult) {
    if (!queryResult.hasOwnProperty(xAxisKey)) {
      continue;
    }

    for (var yAxisKey in queryResult[xAxisKey]) {
      if (!queryResult[xAxisKey].hasOwnProperty(yAxisKey)) {
        continue;
      }
      if (!yAxisTicks.hasOwnProperty(yAxisKey)) {
        yAxisTicks[yAxisKey] = index;
        yAxisSeriesMap[yAxisKey] = [];
        index += 1;
      }
    }
  }


  // Now define y-axis series data
  for (xAxisKey in queryResult) {
    if (!queryResult.hasOwnProperty(xAxisKey)) {
      continue;
    }
    var xAxisKeyData = queryResult[xAxisKey];
    for (yAxisKey in yAxisSeriesMap) {
      if (!yAxisSeriesMap.hasOwnProperty(yAxisKey)) {
        continue;
      }

      if (xAxisKeyData.hasOwnProperty(yAxisKey)) {
        yAxisSeriesMap[yAxisKey].push([xAxisTicksMap[xAxisKey], xAxisKeyData[yAxisKey]])
      } else {
        yAxisSeriesMap[yAxisKey].push([xAxisTicksMap[xAxisKey], 0])
      }


    }
  }
  var yAxisSeries = [];
  var colors = new Colors(Object.keys(yAxisSeriesMap).length);
  this.object.tileContext.uiFiltersList = [];
  for (var yAxisSeriesElement in yAxisSeriesMap) {
    if (!yAxisSeriesMap.hasOwnProperty(yAxisSeriesElement)) {
      continue;
    }
    if (yAxisSeriesMap[yAxisSeriesElement].length > 0) {
      var visible = $.inArray( yAxisSeriesElement, this.object.tileContext.uiFiltersSelectedList);
      if((visible == -1 ? true : false)) {
        yAxisSeries.push({label: yAxisSeriesElement, data: yAxisSeriesMap[yAxisSeriesElement], color:convertHex(colors.nextColor(), 100)})
      }
      this.object.tileContext.uiFiltersList.push(yAxisSeriesElement);
    }
  }
  this.render(yAxisSeries, xAxisTicks)
}
StackedTile.prototype.render = function (yAxisSeries, xAxisTicks) {
  var object = this.object;
  var chartDiv = $("#"+object.id).find(".chart-item");
  var ctx = chartDiv.find("#" + object.id);
  ctx.width(ctx.width);
  ctx.height(fullWidgetChartHeight());
  var chartClassName = object.tileContext.widgetSize == undefined ? getFullWidgetClassName(12) : getFullWidgetClassName(object.tileContext.widgetSize);
  ctx.addClass(chartClassName);
  $("#"+object.id).find(".chart-item").find(".legend").addClass('full-widget-legend');
  var plot = $.plot(ctx, yAxisSeries, {
    series: {
      stack: true
      , bars: {
        show: true,
        label: {
          show: true
        },
        barWidth: 0.5,
        align: "center",
        lineWidth: 1.0,
        fill: true,
        fillColor: {colors: [{opacity: 1}, {opacity: 1}]}
      }
    }
    , grid: {
      hoverable: true
      , color: "#B2B2B2"
      , show: true
      , borderWidth: {
        top: 0
        , right: 0
        , bottom: 1
        , left: 1
      }
    }
    , xaxis: {
      ticks: xAxisTicks,
      tickLength: 0
    }
    , yaxis:{
      tickLength: 0,
      tickFormatter: function(val, axis) {
        return numDifferentiation(val);
      },
     }
    , selection: {
      mode: "x"
      , minSize: 1
    }
    , tooltip: true
    , tooltipOpts: {
      content:
        "%s: %y events at %x"
      , defaultFormat: true
    }
    ,legend: {
      show: false
    }
  });
  drawLegend(yAxisSeries, $(chartDiv.find(".legend")));

  function showTooltip(x, y, contents, color) {
    $('<div id="tooltip">' + contents + '</div>').css({
      position: 'absolute',
      display: 'none',
      top: y + 5,
      left: x + 5,
      border: '1px solid #3a4246',
      padding: '2px',
      'background-color': '#425057',
      opacity: 0.80,
      color: "#fff",
      'z-index': 5000,
    }).appendTo("body").fadeIn(200).fadeOut(60000);
  }

  var previousPoint = null;
  $(ctx).bind("plothover", function (event, pos, item) {
    if (item) {
      $("#tooltip").remove();
      var hoverSeries = item.series; // what series am I hovering?
      var x = item.datapoint[0],
          y = item.datapoint[1];
      var color = item.series.color;

      var a = axisTimeFormatNew(object.tileContext.period, (globalFilters ? getGlobalFilters() : getPeriodSelect(object.id)));
      var strTip = ""; // start string with current hover
      var total = 0;
      var allSeries = plot.getData();
      $.each(allSeries, function(i,s){ // loop all series
        $.each(s.data, function(j,p){
          if (p[0] == x){  // if my hover x == point x add to string
            strTip += "</br>"+ numberWithCommas(p[1]) + " for " + "<span style="+s.color+">"+s.label+"<span>"+ " at "+moment(x).format(a);
            total = total +p[1];
          }
          else {
            $("#tooltip").remove();
            previousPoint = null;
          }
        });

      });
      strTip = "Total value : " +numberWithCommas(total)+strTip ;
      showTooltip(item.pageX, item.pageY, strTip, color);
    } else {
      $("#tooltip").remove();
    }
  });

  var re = re = /\(([0-9]+,[0-9]+,[0-9]+)/;
  $(chartDiv.find('.legend ul li')).on('mouseenter', function() {
    var label = $(this).text();
    console.log(label)
    var allSeries = plot.getData();
    for (var i = 0; i < allSeries.length; i++){
      console.log(allSeries[i].color);
      if (allSeries[i].label == $.trim(label)){
        allSeries[i].oldColor = allSeries[i].color;
        allSeries[i].color = 'rgba(' + re.exec(allSeries[i].color)[1] + ',' + 1 + ')';
      } else {
        allSeries[i].color = 'rgba(' + re.exec(allSeries[i].color)[1] + ',' + 0.1 + ')';
      }
    }
    plot  .draw();
  });

  $(chartDiv.find('.legend ul li')).on('mouseleave', function() {
    var label = $(this).text();
    var allSeries = plot.getData();
    for (var i = 0; i < allSeries.length; i++){
      allSeries[i].color = 'rgba(' + re.exec(allSeries[i].color)[1] + ',' + 1 + ')';
    }
    plot.draw();
  });
}
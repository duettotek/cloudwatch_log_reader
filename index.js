const Realm = require('realm');
const fs = require('fs')
const csv = require("csvtojson");

const WasteLogSchema = {
  name: 'WasteLogSchema',
  properties: {
    date: 'string?',
    model: 'string?',
    GraphicsFillPercentage: 'double?',
    TopSheetFillPercentage: 'double?',
    Columns: 'int?',
    Rows: 'int?',
    Sheets: 'int?'
  }
};

Realm.open({
  path: './realm/pixartprinting.realm',
  schema: [WasteLogSchema]
}).then(realm => {

  // insert data from csv
  const csvFilePath = "./dataInput/aws_query_log.csv";
  csv()
    .fromFile(csvFilePath)
    .then(function (jsonArrayObj) {

      console.log("Start load data...")

      // prima cancello tutti i record....
      realm.write(() => {
        const allLogs = realm.objects('WasteLogSchema');
        realm.delete(allLogs);
      })

      // ...poi li riscrivo prendendoli dal csv
      jsonArrayObj.forEach((element) => {

        realm.write(() => {
          const savedElement = realm.create('WasteLogSchema', {
            date: element.date,
            model: element.model,
            GraphicsFillPercentage: Number(element.GraphicsFillPercentage),
            TopSheetFillPercentage: Number(element.TopSheetFillPercentage),
            Columns: Number(element.Columns),
            Rows: Number(element.Rows),
            Sheets: Number(element.Sheets)
          });

        });

      })

      // ora creo il dataset per il grafico
      // 1) labels
      const labels = [...new Set(realm.objects('WasteLogSchema').map(item => item.model))].sort();
      // 2) dati
      const dataGraphicsFillPercentage = [];
      const dataTopSheetFillPercentage = [];

      labels.forEach((element) => {
        dataGraphicsFillPercentage.push(realm.objects('WasteLogSchema').filtered('model = "' + element + '"').avg("GraphicsFillPercentage"));
        dataTopSheetFillPercentage.push(realm.objects('WasteLogSchema').filtered('model = "' + element + '"').avg("TopSheetFillPercentage"));
      })

      // 3) dataset
      const datasetGraphicsFillPercentage = {
        "label": "GraphicsFillPercentage",
        "backgroundColor": "rgba(255,99,132,0.2)",
        "borderColor": "rgba(255,99,132,1)",
        "borderWidth": 1,
        "hoverBackgroundColor": "rgba(255,99,132,0.4)",
        "hoverBorderColor": "rgba(255,99,132,1)",
        "data": dataGraphicsFillPercentage
      }

      const datasetTopSheetFillPercentage = {
        "label": "TopSheetFillPercentage",
        "backgroundColor": "rgba(112,255,99,0.2)",
        "borderColor": "rgba(112,255,99,1)",
        "borderWidth": 1,
        "hoverBackgroundColor": "rgba(112,255,99,0.4)",
        "hoverBorderColor": "rgba(112,255,99,1)",
        "data": dataTopSheetFillPercentage
      }

      const payload = {
        labels: labels,
        datasets: [datasetGraphicsFillPercentage, datasetTopSheetFillPercentage]
      }
      
      try {
        fs.writeFileSync("./dataOutput/data.json", JSON.stringify(payload, null, 2))
      } catch (err) {
        console.error(err)
      }

      realm.close();
      console.log("End load data!")
    })

})
  .catch(error => {
    console.log(error);
    realm.close();
  });

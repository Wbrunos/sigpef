// -----------------------------------------------------
// COPY THIS CODE TO YOUR GOOGLE APPS SCRIPT EDITOR
// -----------------------------------------------------

// The ID from the link you provided
const SPREADSHEET_ID = '1ulTJMzzCADaLW80TP3ZaMsNXg4TG0QaMMb9u50bHQS4';
const PREFERRED_SHEET_NAME = 'Agendamentos';

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function getTargetSheet() {
  let ss;
  try {
    if (SPREADSHEET_ID) {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    } else {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
  } catch (e) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  let sheet = ss.getSheetByName(PREFERRED_SHEET_NAME);
  if (!sheet) {
    const sheets = ss.getSheets();
    if (sheets.length > 0) {
      sheet = sheets[0];
    }
  }
  return sheet;
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    // 1. Safety check for manual run in Editor
    if (typeof e === 'undefined') {
      return createResponse({ 
        status: 'error', 
        message: 'Do not run manually. Deploy as Web App and use the URL.' 
      });
    }

    const sheet = getTargetSheet();
    if (!sheet) {
      return createResponse({ status: 'error', message: `Sheet not found.` });
    }

    // 2. Setup Headers if needed (First Run)
    if (sheet.getLastRow() === 0) {
       const headers = ["DATA", "PERITO", "ESPECIALIDADE", "PERICIADO", "OBSERVACAO"];
       sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    }

    // 3. Handle GET Request (Read Data)
    if (!e.postData) {
      const dataRange = sheet.getDataRange();
      const values = dataRange.getDisplayValues();
      
      if (values.length <= 1) {
        return createResponse({ status: 'success', data: [] });
      }

      const rows = values.slice(1).map((row, index) => {
        return {
          rowId: index + 2,
          data: row[0],
          perito: row[1],
          especialidade: row[2],
          periciado: row[3],
          observacao: row[4]
        };
      });

      return createResponse({ status: 'success', data: rows });
    }

    // 4. Handle POST Request (Update Data)
    if (e.postData) {
      let params;
      try {
        params = JSON.parse(e.postData.contents);
      } catch (jsonError) {
        return createResponse({ status: 'error', message: 'Invalid JSON body' });
      }
      
      if (!params.rowId || params.observacao === undefined) {
         return createResponse({ status: 'error', message: 'Missing rowId or observacao' });
      }

      const rowToUpdate = parseInt(params.rowId);
      
      // Validation to prevent crashing
      if (isNaN(rowToUpdate) || rowToUpdate > sheet.getLastRow() || rowToUpdate < 2) {
         return createResponse({ status: 'error', message: 'Invalid Row ID' });
      }
      
      // Update specifically column 5 (Observacao)
      sheet.getRange(rowToUpdate, 5).setValue(params.observacao);

      return createResponse({ status: 'success', message: 'Updated successfully' });
    }

  } catch (error) {
    return createResponse({ status: 'error', message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function createResponse(data) {
  // Using MimeType.TEXT prevents some browser/CORS auto-handling issues
  // We will parse it manually on the client side
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.TEXT);
}
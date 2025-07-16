
        // Get references to HTML elements
        const jsonInput = document.getElementById('jsonInput');
        const suggestTypesBtn = document.getElementById('suggestTypesBtn');
        const resultOutput = document.getElementById('resultOutput');
        const typeList = document.getElementById('typeList');

        /**
         * Determines the most suitable MySQL data type for a given JavaScript value.
         * This function attempts to infer the type based on common patterns.
         * @param {*} value The JavaScript value to analyze.
         * @returns {string} The suggested MySQL data type.
         */
        function suggestMySQLType(value) {
            const jsType = typeof value;

            if (value === null) {
                return 'NULL (any type)'; // Null can be stored in any nullable column
            }

            switch (jsType) {
                case 'number':
                    // Check for integer vs float
                    if (Number.isInteger(value)) {
                        // Consider value range for INT, BIGINT
                        if (value >= -2147483648 && value <= 2147483647) {
                            return 'INT'; // Standard integer range
                        } else {
                            return 'BIGINT'; // For larger integers
                        }
                    } else {
                        // Floating-point numbers
                        return 'DOUBLE'; // DOUBLE for general floating point, or DECIMAL for precision
                    }
                case 'boolean':
                    return 'TINYINT(1)'; // MySQL typically stores booleans as TINYINT(1)
                case 'string':
                    // Attempt to parse as date/datetime
                    if (!isNaN(new Date(value)) && new Date(value).toISOString() === value) {
                        // ISO 8601 format (e.g., "YYYY-MM-DDTHH:MM:SSZ")
                        return 'DATETIME / TIMESTAMP';
                    }
                    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        // YYYY-MM-DD format
                        return 'DATE';
                    }
                    if (value.match(/^\d{2}:\d{2}:\d{2}$/)) {
                        // HH:MM:SS format
                        return 'TIME';
                    }
                    // Attempt to parse as a number string (e.g., "123", "99.99")
                    if (!isNaN(value) && !isNaN(parseFloat(value))) {
                        const numValue = parseFloat(value);
                        if (Number.isInteger(numValue)) {
                            if (numValue >= -2147483648 && numValue <= 2147483647) {
                                return 'INT (from string)';
                            } else {
                                return 'BIGINT (from string)';
                            }
                        } else {
                            // For decimal strings, suggest DECIMAL with example precision/scale
                            return 'DECIMAL(10,2) (from string)';
                        }
                    }
                    // Default string types
                    if (value.length <= 255) {
                        return 'VARCHAR(255)'; // Common default length
                    } else if (value.length <= 65535) {
                        return 'TEXT'; // For longer strings
                    } else {
                        return 'LONGTEXT'; // For very long strings
                    }
                case 'object':
                    // Handle arrays and plain objects (nested JSON)
                    if (Array.isArray(value)) {
                        // For arrays, suggest JSON type (MySQL 5.7+)
                        // Alternatively, you might normalize and store in a separate table.
                        return 'JSON (or separate table)';
                    } else {
                        // For plain objects, suggest JSON type (MySQL 5.7+)
                        return 'JSON (or separate table)';
                    }
                default:
                    return 'VARCHAR(255) (uncommon type)'; // Fallback for other JS types like 'symbol', 'bigint' (if not handled as number string)
            }
        }

        // Event listener for the button click
        suggestTypesBtn.addEventListener('click', () => {
            const jsonString = jsonInput.value.trim();
            typeList.innerHTML = ''; // Clear previous results
            resultOutput.classList.remove('hidden'); // Show the result area

            if (jsonString === '') {
                typeList.innerHTML = '<li class="text-red-600">Please enter JSON data.</li>';
                resultOutput.classList.remove('bg-green-50', 'border-green-200');
                resultOutput.classList.add('bg-red-50', 'border-red-200');
                return;
            }

            try {
                const jsonData = JSON.parse(jsonString);

                // Ensure it's an object or array at the top level
                if (typeof jsonData !== 'object' || jsonData === null) {
                    typeList.innerHTML = '<li class="text-red-600">Invalid JSON: Please enter a JSON object or array.</li>';
                    resultOutput.classList.remove('bg-green-50', 'border-green-200');
                    resultOutput.classList.add('bg-red-50', 'border-red-200');
                    return;
                }

                // If it's an array of objects, take the first object for type inference
                let dataToAnalyze = jsonData;
                if (Array.isArray(jsonData) && jsonData.length > 0 && typeof jsonData[0] === 'object') {
                    dataToAnalyze = jsonData[0];
                    const note = document.createElement('li');
                    note.className = 'text-blue-600 text-sm';
                    note.textContent = 'Analyzing the first object in the array for type suggestions.';
                    typeList.appendChild(note);
                } else if (Array.isArray(jsonData) && jsonData.length > 0) {
                     // If it's an array of primitives, suggest JSON or TEXT
                    const note = document.createElement('li');
                    note.className = 'text-blue-600 text-sm';
                    note.textContent = `Array of primitives detected. Consider: JSON or TEXT`;
                    typeList.appendChild(note);
                    return; // Stop further processing for simple arrays
                } else if (Array.isArray(jsonData) && jsonData.length === 0) {
                    const note = document.createElement('li');
                    note.className = 'text-blue-600 text-sm';
                    note.textContent = 'Empty array detected. No type suggestions can be made.';
                    typeList.appendChild(note);
                    return;
                }


                // Iterate through the key-value pairs of the (first) object
                for (const key in dataToAnalyze) {
                    if (dataToAnalyze.hasOwnProperty(key)) {
                        const value = dataToAnalyze[key];
                        const suggestedType = suggestMySQLType(value);

                        const listItem = document.createElement('li');
                        listItem.innerHTML = `<strong class="text-indigo-700">${key}</strong>: ${suggestedType}`;
                        typeList.appendChild(listItem);
                    }
                }

                resultOutput.classList.remove('bg-red-50', 'border-red-200');
                resultOutput.classList.add('bg-green-50', 'border-green-200');

            } catch (error) {
                // Handle JSON parsing errors
                typeList.innerHTML = `<li class="text-red-600">Invalid JSON format: ${error.message}. Please check your JSON syntax.</li>`;
                resultOutput.classList.remove('bg-green-50', 'border-green-200');
                resultOutput.classList.add('bg-red-50', 'border-red-200');
            }
        });

        // Optional: Allow pressing Enter (Ctrl+Enter for textarea) to trigger the check
        jsonInput.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                suggestTypesBtn.click();
            }
        });
 document.querySelector("#searchByKeywordForm").addEventListener("submit", validateKeywordForm);

        //ensure that keyword has at least 3 characters
        function validateKeywordForm(event){
            let keyword = document.querySelector("input[name='keyword']").value;
            let errorDiv = document.querySelector("#keywordError");

            if(keyword.length < 3){
                // stop form submission properly
                event.preventDefault();

                // display error  in red text on the page instead of an alert box
                errorDiv.textContent = "Keyword must be at least 3 characters long, bro.";

                return false; //prevent form submission (forcefully exit the function here  to avoid any unintended consequences of the form submitting after the event.preventDefault() line)
            }else{
                // clear error message if validation passes
                errorDiv.textContent = ""; 
                return true; //allow form submission
            }

        }
            
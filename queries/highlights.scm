(line_comment) @comment

(string_literal) @string
(number_literal) @number
(date_literal) @number
(time_literal) @number
(boolean_literal) @boolean

(attribute
  name: (identifier) @attribute)

(procedure_declaration
  name: (identifier) @function)

(parameter
  name: (identifier) @variable.parameter)

(variable_declaration
  name: (identifier) @variable)

(property_assignment
  name: (property_name) @property)

(object_header
  object_type: (object_type) @type)

((identifier) @keyword.control
  (#match? @keyword.control "^(BEGIN|END|IF|THEN|ELSE|CASE|OF|REPEAT|UNTIL|FOR|FOREACH|WHILE|WITH|DO|EXIT|VAR|LOCAL|PROCEDURE)$"))

((identifier) @keyword.operator
  (#match? @keyword.operator "^(AND|IN|NOT|OR|XOR|DIV|MOD)$"))

((identifier) @constant.builtin
  (#match? @constant.builtin "^(TRUE|FALSE|YES|NO|CurrPage|CurrReport|Rec|xRec|RequestOptionsPage)$"))

((identifier) @function.builtin
  (#match? @function.builtin "^(ABS|ROUND|STRSUBSTNO|FORMAT|COPYSTR|FIND|FINDFIRST|FINDLAST|FINDSET|GET|SETRANGE|SETFILTER|VALIDATE|TESTFIELD|CALCFIELDS|MESSAGE|ERROR|CONFIRM|EVALUATE|UPPERCASE|LOWERCASE|CREATEINSTREAM|CREATEOUTSTREAM|RUN|RUNMODAL|COPY|COUNT|DELETE|DELETEALL|MODIFY|MODIFYALL|INSERT|INIT|RESET|NEXT|ISEMPTY)$"))

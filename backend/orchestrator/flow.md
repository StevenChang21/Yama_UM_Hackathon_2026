Step 1: messages = [system_prompt, user_input]
        ↓
        Send to LLM (line 100)
        ↓
        AI responds: "I want to call get_sales_data AND get_inventory_data"
        ↓
Step 2: _execute_tool_calls runs:
        messages.append(AI's message)          ← so AI remembers what it asked for
        messages.append(sales_data result)     ← tool response #1
        messages.append(inventory_data result) ← tool response #2
        ↓
        Loop continues → back to line 100
        ↓
Step 3: Send the ENTIRE messages list to LLM again
        Now messages = [system, user, AI_request, tool_result_1, tool_result_2]
        ↓
        AI sees all the data, decides it has enough info
        ↓
        Returns final JSON (no tool_calls) → _handle_final_response → done
